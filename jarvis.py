#!/usr/bin/env python3
"""
Armory x Jarvis: move the robots with your hands.

Run this script, a browser tab opens with the Armory viewer, click "Start hand
control", and your webcam tracks your hands. The page does the rest.

    pip install mediapipe opencv-python aiohttp
    python3 jarvis.py

Gestures (mirror view, like looking in a mirror):

    Two hands, pull apart / push together .... open / close the suit
    Pinch (thumb + index) and drag ............ orbit the robot
    Pinch and release quickly ................. click (select a part, press a button)
    Open palm, quick sideways flick ........... switch between the two robots
    Fist, then open the hand .................. open the suit all the way
    Open hand, then close to a fist ........... close the suit

The pinch point (between thumb and index tip) is your cursor, so you can also
click the parts list, the dock buttons and the slider labels from the air.

Only hand landmarks (21 points per hand) go to the page, never camera frames, and
the server only listens on 127.0.0.1 and only accepts its own page.

No camera? Try `python3 jarvis.py --demo` for a simulated pair of hands, or
`python3 jarvis.py --selftest` to check the gesture engine.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import sys
import threading
import time
import urllib.request
import webbrowser
from collections import deque
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE / "dist" / "index.html"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = Path.home() / ".cache" / "armory-jarvis" / "hand_landmarker.task"
HAND_LINKS = (
    (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (17, 18), (18, 19), (19, 20), (0, 17),
)

# ───────────────────────────── gesture engine ─────────────────────────────
# Pure Python, no third-party imports, so it can be tested without a camera.
# A hand is a list of 21 (x, y) points in 0..1 image coordinates (MediaPipe order).

FINGERS = ((5, 6, 8), (9, 10, 12), (13, 14, 16), (17, 18, 20))  # MCP, PIP, tip
PALM_POINTS = (0, 5, 9, 13, 17)

PINCH_ON = 0.32  # thumb-index gap / hand size to start a pinch
PINCH_OFF = 0.50  # ... and to release it
CLICK_MAX_S = 0.7  # a pinch shorter than this, without moving, is a click
DRAG_MIN = 0.025  # how far a pinch must travel (fraction of frame) to become a drag
SPREAD_GAIN = 2.4  # two-hand distance change -> explode change
FLICK_DIST = 0.28  # palm travel (fraction of frame width) inside FLICK_WINDOW_S
FLICK_WINDOW_S = 0.35
PINCH_REACH = 1.1  # index tip must be this far from the wrist (hand sizes), else it is a fist, not a pinch
COOLDOWN_S = 1.5


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


class Hand:
    """Features of one tracked hand."""

    def __init__(self, lm):
        self.lm = lm
        self.size = max(dist(lm[0], lm[9]), 1e-4)  # wrist to middle knuckle
        self.palm = (
            sum(lm[i][0] for i in PALM_POINTS) / len(PALM_POINTS),
            sum(lm[i][1] for i in PALM_POINTS) / len(PALM_POINTS),
        )
        self.point = mid(lm[4], lm[8])  # pinch point, used as the cursor
        self.pinch_ratio = dist(lm[4], lm[8]) / self.size
        self.reach = dist(lm[8], lm[0]) / self.size  # a clenched fist keeps the index tip close to the palm
        # a finger counts as extended when its tip is clearly farther from the wrist than its middle joint
        self.ext = [dist(lm[t], lm[0]) > dist(lm[p], lm[0]) * 1.12 for _, p, t in FINGERS]
        self.n_ext = sum(self.ext)


class GestureEngine:
    """Turns hand landmarks into viewer commands. Call update() once per camera frame."""

    def __init__(self):
        self.pinching = False
        self.pinch_t0 = 0.0
        self.pinch_origin = None
        self.dragging = False
        self.cursor = None  # smoothed pinch point
        self.two_frames = 0
        self.last_spread = None
        self.palm_hist = deque()
        self.shape = None  # debounced shape: 'fist' | 'open' | None
        self.shape_since = 0.0
        self.cand = None
        self.cand_n = 0
        self.cool = {}
        self.lost_since = None

    # -- helpers --------------------------------------------------------
    def _cool(self, name, t):
        return t < self.cool.get(name, 0.0)

    def _arm(self, name, t, secs=COOLDOWN_S):
        self.cool[name] = t + secs

    @staticmethod
    def _label(hand, pinching):
        if pinching:
            return "pinch"
        if hand.n_ext == 0:
            return "fist"
        if hand.n_ext >= 3:
            return "open"
        if hand.ext[0] and hand.n_ext == 1:
            return "point"
        return "other"

    def _smooth(self, p):
        if self.cursor is None:
            self.cursor = p
        else:
            d = dist(self.cursor, p)
            a = 0.35 + min(0.55, d * 6)  # follow quickly when moving far, steady when still
            self.cursor = (self.cursor[0] + (p[0] - self.cursor[0]) * a, self.cursor[1] + (p[1] - self.cursor[1]) * a)
        return self.cursor

    # -- main entry -----------------------------------------------------
    def update(self, hands_lm, t):
        """Returns (events, frame). events are command dicts, frame is the status for the HUD."""
        events = []
        hands = [Hand(lm) for lm in hands_lm[:2]]
        mode = "none"
        labels = []
        cursor_out = None

        if not hands:
            if self.lost_since is None:
                self.lost_since = t
            if t - self.lost_since > 0.25:
                self._reset_hand()
            return events, self._frame(hands, labels, "none", None)
        self.lost_since = None

        if len(hands) == 2:
            self.two_frames += 1
        else:
            self.two_frames = 0
            self.last_spread = None

        if self.two_frames >= 3:
            # Two hands: pull apart to open, push together to close.
            mode = "two"
            self._reset_pinch()
            spread = dist(hands[0].palm, hands[1].palm)
            if self.last_spread is not None:
                d = spread - self.last_spread
                if abs(d) > 0.002:
                    events.append({"type": "explode", "delta": round(d * SPREAD_GAIN, 4)})
            self.last_spread = spread
            labels = [self._label(h, False) for h in hands]
            self.palm_hist.clear()
            return events, self._frame(hands, labels, mode, None)

        # One hand (the larger one if two are briefly visible).
        h = max(hands, key=lambda x: x.size)
        mode = "one"
        cur = self._smooth(h.point)

        # pinch with hysteresis
        if not self.pinching and h.pinch_ratio < PINCH_ON and h.reach > PINCH_REACH:
            self.pinching = True
            self.pinch_t0 = t
            self.pinch_origin = cur
            self.dragging = False
        elif self.pinching and (h.pinch_ratio > PINCH_OFF or h.reach < PINCH_REACH - 0.15):
            if not self.dragging and t - self.pinch_t0 < CLICK_MAX_S:
                events.append({"type": "click", "x": round(self.pinch_origin[0], 4), "y": round(self.pinch_origin[1], 4)})
            self._reset_pinch()

        if self.pinching:
            if not self.dragging and dist(cur, self.pinch_origin) > DRAG_MIN:
                self.dragging = True
                self.pinch_prev = self.pinch_origin
            if self.dragging:
                dx, dy = cur[0] - self.pinch_prev[0], cur[1] - self.pinch_prev[1]
                self.pinch_prev = cur
                if dx or dy:
                    events.append({"type": "orbit", "dx": round(dx, 4), "dy": round(dy, 4)})

        label = self._label(h, self.pinching)
        labels = [label]
        cursor_out = {"x": round(cur[0], 4), "y": round(cur[1], 4), "pinching": self.pinching}

        # debounced fist / open palm, for "open the suit" and "close the suit"
        events += self._shape_events(label, t)

        # quick sideways flick of an open palm swaps the robot
        if label == "open" and not self.pinching:
            self.palm_hist.append((t, h.palm[0]))
            while self.palm_hist and t - self.palm_hist[0][0] > FLICK_WINDOW_S:
                self.palm_hist.popleft()
            xs = [x for _, x in self.palm_hist]
            if len(xs) >= 4 and (max(xs) - min(xs)) >= FLICK_DIST and not self._cool("swap", t):
                events.append({"type": "swap"})
                self._arm("swap", t)
                self.palm_hist.clear()
        else:
            self.palm_hist.clear()

        return events, self._frame(hands, labels, mode, cursor_out)

    def _shape_events(self, label, t):
        out = []
        cand = label if label in ("fist", "open") else None
        if cand == self.cand:
            self.cand_n += 1
        else:
            self.cand, self.cand_n = cand, 1
        if self.cand_n == 3 and cand != self.shape:
            prev, prev_since = self.shape, self.shape_since
            if cand is not None:
                if prev == "fist" and cand == "open" and t - prev_since >= 0.25 and not self._cool("open", t):
                    out.append({"type": "explode_to", "value": 1.0})
                    self._arm("open", t, 1.0)
                elif prev == "open" and cand == "fist" and t - prev_since >= 0.25 and not self._cool("close", t):
                    out.append({"type": "explode_to", "value": 0.0})
                    self._arm("close", t, 1.0)
                self.shape, self.shape_since = cand, t
            # leaving fist/open into "other" keeps the last real shape for a moment
        return out

    def _reset_pinch(self):
        self.pinching = False
        self.dragging = False
        self.pinch_origin = None

    def _reset_hand(self):
        self._reset_pinch()
        self.cursor = None
        self.palm_hist.clear()
        self.shape = None
        self.cand = None
        self.cand_n = 0
        self.two_frames = 0
        self.last_spread = None

    @staticmethod
    def _frame(hands, labels, mode, cursor):
        return {
            "type": "frame",
            "mode": mode,
            "hands": [
                {"lm": [[round(x, 3), round(y, 3)] for x, y in h.lm], "shape": labels[i] if i < len(labels) else "other"}
                for i, h in enumerate(hands)
            ],
            "cursor": cursor,
        }


# ───────────────────────────── synthetic hands ─────────────────────────────
# Used by --demo and --selftest. Canonical hand with the wrist at the origin, y pointing down the
# image, so fingers point up (negative y). One unit = wrist to middle knuckle.

_OPEN = {
    "thumb": [(-0.35, -0.25), (-0.6, -0.5), (-0.8, -0.75), (-0.95, -0.95)],
    "index": [(-0.35, -1.0), (-0.4, -1.45), (-0.42, -1.7), (-0.43, -1.95)],
    "middle": [(0.0, -1.05), (0.0, -1.6), (0.0, -1.9), (0.0, -2.15)],
    "ring": [(0.33, -1.0), (0.37, -1.5), (0.39, -1.75), (0.4, -1.98)],
    "pinky": [(0.62, -0.9), (0.7, -1.3), (0.74, -1.5), (0.77, -1.7)],
}
_CURL = {
    "index": [(-0.35, -1.0), (-0.38, -1.3), (-0.34, -1.1), (-0.3, -0.8)],
    "middle": [(0.0, -1.05), (0.0, -1.35), (0.0, -1.15), (0.0, -0.8)],
    "ring": [(0.33, -1.0), (0.35, -1.3), (0.34, -1.1), (0.32, -0.8)],
    "pinky": [(0.62, -0.9), (0.64, -1.15), (0.62, -1.0), (0.58, -0.75)],
}
_THUMB_IN = [(-0.35, -0.25), (-0.4, -0.5), (-0.3, -0.7), (-0.2, -0.85)]


def make_hand(shape, cx, cy, scale=0.11, pinch=0.0):
    """shape: 'open' | 'fist' | 'point' | 'pinch'. Returns 21 (x, y) points centred near (cx, cy)."""
    pts = {"wrist": (0.0, 0.0)}
    fingers = {}
    for name in ("index", "middle", "ring", "pinky"):
        ext = shape == "open" or (shape == "point" and name == "index") or (shape == "pinch" and name != "index")
        fingers[name] = list(_OPEN[name] if ext else _CURL[name])
    thumb = list(_THUMB_IN if shape in ("fist", "point") else _OPEN["thumb"])
    if shape == "pinch":
        # index bends toward the thumb, tips meet; `pinch` > 0 opens the gap again
        tip = (-0.62, -1.4)
        fingers["index"] = [(-0.35, -1.0), (-0.45, -1.3), (-0.52, -1.38), tip]
        thumb = [(-0.35, -0.25), (-0.5, -0.7), (-0.58, -1.1), (tip[0] - pinch, tip[1] + pinch * 0.5)]
    pts_list = [pts["wrist"]] + thumb + fingers["index"] + fingers["middle"] + fingers["ring"] + fingers["pinky"]
    return [(cx + x * scale, cy + y * scale) for x, y in pts_list]


def _selftest():
    """Drive the engine with synthetic hands and check every gesture. Returns True when all pass."""
    results = []

    def check(name, cond, extra=""):
        results.append(bool(cond))
        print(("PASS  " if cond else "FAIL  ") + name + (f"  {extra}" if extra else ""))

    def run(frames, engine=None, t0=0.0, fps=30):
        engine = engine or GestureEngine()
        evs, t = [], t0
        for hands in frames:
            e, _ = engine.update(hands, t)
            evs += e
            t += 1.0 / fps
        return engine, evs, t

    # 1. two hands apart opens, together closes
    ap = [[make_hand("open", 0.5 - s, 0.5), make_hand("open", 0.5 + s, 0.5)] for s in [0.08 + i * 0.01 for i in range(25)]]
    _, evs, _ = run(ap)
    total = sum(e["delta"] for e in evs if e["type"] == "explode")
    check("two hands pulling apart opens the suit", total > 0.6, f"delta={total:.2f}")
    _, evs, _ = run(list(reversed(ap)))
    total = sum(e["delta"] for e in evs if e["type"] == "explode")
    check("two hands pushing together closes it", total < -0.6, f"delta={total:.2f}")

    # 2. quick pinch = click at the pinch point
    fr = [[make_hand("point", 0.4, 0.5)]] * 6 + [[make_hand("pinch", 0.4, 0.5)]] * 8 + [[make_hand("open", 0.4, 0.5)]] * 4
    _, evs, _ = run(fr)
    clicks = [e for e in evs if e["type"] == "click"]
    check("quick pinch clicks once", len(clicks) == 1, str(clicks))
    check("click lands near the pinch point", clicks and abs(clicks[0]["x"] - 0.4) < 0.12 and abs(clicks[0]["y"] - 0.4) < 0.2, str(clicks[:1]))

    # 3. pinch + drag = orbit
    fr = [[make_hand("open", 0.3, 0.5)]] * 5 + [[make_hand("pinch", 0.3 + i * 0.01, 0.5)] for i in range(30)]
    _, evs, _ = run(fr)
    dx = sum(e["dx"] for e in evs if e["type"] == "orbit")
    check("pinch-drag orbits", dx > 0.15 and not [e for e in evs if e["type"] == "click"], f"dx={dx:.2f}")

    # 4. flick swaps robots
    fr = [[make_hand("open", 0.2 + i * 0.04, 0.5)] for i in range(14)]
    _, evs, _ = run(fr)
    check("open-palm flick swaps robot", len([e for e in evs if e["type"] == "swap"]) == 1, str([e["type"] for e in evs]))
    fr = [[make_hand("open", 0.5 + (i % 2) * 0.01, 0.5)] for i in range(40)]
    _, evs, _ = run(fr)
    check("a still open palm does not swap", not evs, str(evs))

    # 5. fist -> open opens, open -> fist closes
    fr = [[make_hand("fist", 0.5, 0.5)]] * 12 + [[make_hand("open", 0.5, 0.5)]] * 8
    _, evs, _ = run(fr)
    check("fist then open hand opens the suit", [e for e in evs if e["type"] == "explode_to" and e["value"] == 1.0], str(evs))
    fr = [[make_hand("open", 0.5, 0.5)]] * 12 + [[make_hand("fist", 0.5, 0.5)]] * 8
    _, evs, _ = run(fr)
    check("open hand then fist closes the suit", [e for e in evs if e["type"] == "explode_to" and e["value"] == 0.0], str(evs))

    # 6. pointing only moves the cursor
    fr = [[make_hand("point", 0.3 + i * 0.01, 0.5)] for i in range(20)]
    eng, evs, _ = run(fr)
    check("pointing sends no commands", not evs, str(evs))

    # 7. hand leaving resets state
    eng, _, t = run([[make_hand("pinch", 0.5, 0.5)]] * 5)
    run([[]] * 15, engine=eng, t0=t)
    check("losing the hand ends the pinch", not eng.pinching and eng.cursor is None)

    ok = all(results)
    print(f"\n{sum(results)}/{len(results)} checks passed")
    return ok


# ───────────────────────────── hand sources ─────────────────────────────

class Source(threading.Thread):
    """Base thread: produces hand landmarks, runs the engine, and hands messages to the hub."""

    def __init__(self, hub):
        super().__init__(daemon=True)
        self.hub = hub
        self.stop_flag = threading.Event()
        self.engine = GestureEngine()
        self._last_frame_t = 0.0

    def push(self, hands, t):
        events, frame = self.engine.update(hands, t)
        for e in events:
            self.hub.send(e)
        if t - self._last_frame_t >= 1 / 30:  # cap the HUD stream at 30 fps
            self._last_frame_t = t
            self.hub.send(frame)

    def stop(self):
        self.stop_flag.set()


def ensure_model(say=print):
    """The current MediaPipe needs a small model file (about 8 MB). Download it once and cache it."""
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 1_000_000:
        return MODEL_PATH
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    say("Downloading the hand model once (about 8 MB)...")
    tmp = MODEL_PATH.with_suffix(".part")
    urllib.request.urlretrieve(MODEL_URL, tmp)
    tmp.replace(MODEL_PATH)
    return MODEL_PATH


def make_detector(mp, say=print):
    """Returns (detect, close). detect(rgb_frame, ts_ms) -> list of hands, each 21 (x, y) points.

    Uses the classic mp.solutions API when this MediaPipe still has it, otherwise the newer Tasks API.
    """
    if hasattr(mp, "solutions"):
        hands = mp.solutions.hands.Hands(
            static_image_mode=False, max_num_hands=2, model_complexity=0,
            min_detection_confidence=0.6, min_tracking_confidence=0.5,
        )

        def detect(rgb, _ts):
            res = hands.process(rgb)
            return [[(p.x, p.y) for p in h.landmark] for h in (res.multi_hand_landmarks or [])]

        return detect, hands.close

    from mediapipe.tasks.python import BaseOptions, vision  # type: ignore

    model = ensure_model(say)
    opts = vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model)),
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.55,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.HandLandmarker.create_from_options(opts)
    last = [-1]

    def detect(rgb, ts_ms):
        ts_ms = max(int(ts_ms), last[0] + 1)  # the Tasks API needs strictly increasing timestamps
        last[0] = ts_ms
        res = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)
        return [[(p.x, p.y) for p in h] for h in res.hand_landmarks]

    return detect, landmarker.close


class CameraSource(Source):
    def __init__(self, hub, camera=0, preview=False, width=640, height=480):
        super().__init__(hub)
        self.camera, self.preview, self.width, self.height = camera, preview, width, height

    def run(self):
        try:
            import cv2  # type: ignore
            import mediapipe as mp  # type: ignore
        except ImportError as exc:
            self.hub.status("error", f"Missing package ({exc.name}). Run: pip install mediapipe opencv-python aiohttp")
            return
        try:
            detect, close = make_detector(mp, lambda m: self.hub.status("starting", m))
        except Exception as exc:  # model download or API problems
            self.hub.status("error", f"Could not start hand tracking: {exc}")
            return
        cap = cv2.VideoCapture(self.camera)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        if not cap.isOpened():
            close()
            self.hub.status("error", f"Could not open camera {self.camera}. Close other apps using it, or pass --camera 1.")
            return
        self.hub.status("running", "Camera on. Show your hands.")
        t0 = time.monotonic()
        try:
            while not self.stop_flag.is_set():
                ok, frame = cap.read()
                if not ok:
                    time.sleep(0.01)
                    continue
                frame = cv2.flip(frame, 1)  # mirror, so moving your hand right moves the cursor right
                now = time.monotonic()
                hands = detect(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), (now - t0) * 1000)
                self.push(hands, now)
                if self.preview:
                    h_px, w_px = frame.shape[:2]
                    for lm in hands:
                        for a, b in HAND_LINKS:
                            cv2.line(frame, (int(lm[a][0] * w_px), int(lm[a][1] * h_px)), (int(lm[b][0] * w_px), int(lm[b][1] * h_px)), (255, 220, 60), 2)
                    cv2.imshow("Armory x Jarvis (Esc to close preview)", frame)
                    if cv2.waitKey(1) & 0xFF == 27:
                        break
        finally:
            close()
            cap.release()
            if self.preview:
                cv2.destroyAllWindows()
            self.hub.status("stopped", "Camera off.")


class DemoSource(Source):
    """Simulated hands that perform every gesture in a loop. No camera or MediaPipe needed."""

    def run(self):
        self.hub.status("running", "Demo mode: simulated hands.")
        t0 = time.monotonic()
        while not self.stop_flag.is_set():
            t = time.monotonic() - t0
            self.push(self.pose(t % 26.0), time.monotonic())
            time.sleep(1 / 30)
        self.hub.status("stopped", "Demo off.")

    @staticmethod
    def pose(t):
        if t < 3:  # point and wander (cursor)
            return [make_hand("point", 0.5 + 0.18 * math.cos(t * 2), 0.5 + 0.1 * math.sin(t * 2))]
        if t < 4:  # pinch click in the middle
            return [make_hand("pinch" if t > 3.3 and t < 3.6 else "point", 0.5, 0.5)]
        if t < 8:  # pinch and drag, orbit
            return [make_hand("pinch", 0.3 + 0.4 * ((t - 4) / 4), 0.5 + 0.05 * math.sin(t * 3))]
        if t < 9:
            return [make_hand("open", 0.5, 0.5)]
        if t < 15:  # two hands: apart, then together
            s = 0.1 + 0.22 * (0.5 - 0.5 * math.cos((t - 9) / 6 * 2 * math.pi))
            return [make_hand("open", 0.5 - s, 0.5), make_hand("open", 0.5 + s, 0.5)]
        if t < 17:
            return []
        if t < 18.5:  # fist ...
            return [make_hand("fist", 0.5, 0.5)]
        if t < 21:  # ... then open: open the suit
            return [make_hand("open", 0.5, 0.5)]
        if t < 22.2:  # ... then fist: close it
            return [make_hand("fist", 0.5, 0.5)]
        if t < 23.5:
            return []
        if t < 23.9:  # flick: swap robots
            return [make_hand("open", 0.25 + (t - 23.5) / 0.4 * 0.5, 0.5)]
        return []


# ───────────────────────────── server ─────────────────────────────

class Hub:
    """Keeps the WebSocket clients and the active hand source."""

    def __init__(self, args):
        self.args = args
        self.clients = set()
        self.source = None
        self.loop = None
        self.state = "stopped"

    def send(self, msg):
        """Thread-safe: queue a JSON message for every client."""
        if self.loop is None or not self.clients:
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(msg), self.loop)

    async def _broadcast(self, msg):
        data = json.dumps(msg, separators=(",", ":"))
        for ws in list(self.clients):
            try:
                await ws.send_str(data)
            except Exception:
                self.clients.discard(ws)

    def status(self, state, message=""):
        self.state = state
        print(f"[jarvis] {state}: {message}" if message else f"[jarvis] {state}")
        self.send({"type": "status", "state": state, "message": message})

    def start(self):
        if self.source and self.source.is_alive():
            self.status("running", "Already running.")
            return
        self.status("starting", "Opening the camera...")
        a = self.args
        self.source = DemoSource(self) if a.demo else CameraSource(self, a.camera, a.preview)
        self.source.start()

    def stop(self):
        if self.source:
            self.source.stop()
            self.source = None
        if self.state not in ("stopped", "error"):
            self.status("stopped", "Stopped.")


def build_app(args):
    try:
        from aiohttp import web, WSMsgType  # type: ignore
    except ImportError:
        sys.exit("aiohttp is required: pip install aiohttp")

    hub = Hub(args)
    allowed = {f"localhost:{args.port}", f"127.0.0.1:{args.port}"}

    @web.middleware
    async def guard(request, handler):
        # Only this server's own page may talk to it (blocks other websites and DNS rebinding).
        if request.headers.get("Host", "") not in allowed:
            raise web.HTTPForbidden(text="Unexpected Host header.")
        return await handler(request)

    async def index(_request):
        if not INDEX.exists():
            return web.Response(status=404, text="dist/index.html not found. Run: npm install && npm run build")
        return web.FileResponse(INDEX)

    async def ws_handler(request):
        origin = request.headers.get("Origin", "")
        if origin not in {f"http://{h}" for h in allowed}:
            raise web.HTTPForbidden(text="Open the viewer from this script's own address.")
        ws = web.WebSocketResponse(heartbeat=20)
        await ws.prepare(request)
        hub.loop = asyncio.get_running_loop()
        hub.clients.add(ws)
        await ws.send_str(json.dumps({"type": "hello", "demo": bool(args.demo), "state": hub.state}))
        try:
            async for msg in ws:
                if msg.type != WSMsgType.TEXT:
                    continue
                try:
                    cmd = json.loads(msg.data).get("type")
                except ValueError:
                    continue
                if cmd == "start":
                    hub.start()
                elif cmd == "stop":
                    hub.stop()
        finally:
            hub.clients.discard(ws)
            if not hub.clients:
                hub.stop()  # camera off when the page closes
        return ws

    app = web.Application(middlewares=[guard])
    app.router.add_get("/", index)
    app.router.add_get("/index.html", index)
    app.router.add_get("/ws", ws_handler)
    return app, hub


def main():
    ap = argparse.ArgumentParser(description="Control the Armory robots with your hands.")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--camera", type=int, default=0, help="camera index (default 0)")
    ap.add_argument("--preview", action="store_true", help="also show an OpenCV window with the hand skeleton")
    ap.add_argument("--demo", action="store_true", help="simulated hands, no camera needed")
    ap.add_argument("--no-browser", action="store_true", help="do not open the browser automatically")
    ap.add_argument("--selftest", action="store_true", help="test the gesture engine and exit")
    args = ap.parse_args()

    if args.selftest:
        sys.exit(0 if _selftest() else 1)

    try:
        from aiohttp import web  # type: ignore
    except ImportError:
        sys.exit("aiohttp is required: pip install aiohttp")
    app, _hub = build_app(args)
    url = f"http://localhost:{args.port}/"
    print(f"[jarvis] viewer at {url}")
    print("[jarvis] click 'Start hand control' in the page to turn the camera on. Ctrl+C to quit.")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        web.run_app(app, host="127.0.0.1", port=args.port, print=None)
    except OSError as exc:
        if exc.errno in (48, 98, 10048):  # address already in use (macOS, Linux, Windows)
            sys.exit(f"Port {args.port} is already in use. Is jarvis.py already running? Close it, or pick another port: python3 jarvis.py --port {args.port + 1}")
        raise


if __name__ == "__main__":
    main()
