#!/usr/bin/env python3
"""Measure the robots from their makers' pictures.

For every view listed in views.json this downloads the picture, cuts the robot out (from the
transparency, or from a plain background), and measures, in millimetres:

  * the outline: for each height, the left and right edge (front views), the front and back edge
    (side views), or for each depth the left and right edge (top views);
  * named regions: panels, windows, lamps, screens and so on, each found from a seed point and a
    colour rule, traced as an outline polygon, with its box and centre.

The scale comes from a published size (the height for front and side views, the length or width for
top views), so every number is in real millimetres. The results go to src/data/shapes/<robot>.js,
which the robot definitions read. With --debug DIR it also writes each picture with what was traced
drawn over it, to check by eye.

Front views: x is to the right in the picture, which is the robot's left (+x in the model), measured
from the robot's centre line; y is up from the floor. Side views: z is towards the robot's front.
Top views: x as in the front view, z towards the front.

Usage: python3 tools/measure/measure.py [robot ...] [--debug DIR]
Needs: numpy, opencv-python-headless, pillow.
"""
import hashlib
import json
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CACHE = os.path.join(HERE, '.cache')
OUT = os.path.join(ROOT, 'src', 'data', 'shapes')


def fetch(url):
    os.makedirs(CACHE, exist_ok=True)
    ext = os.path.splitext(url.split('?')[0])[1] or '.img'
    fn = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest()[:14] + ext)
    if not os.path.exists(fn):
        req = urllib.request.Request(url.replace(' ', '%20'), headers={'User-Agent': 'catalogue-measure/1.0'})
        with urllib.request.urlopen(req, timeout=90) as r, open(fn, 'wb') as f:
            f.write(r.read())
    return fn


def load(url):
    return np.array(Image.open(fetch(url)).convert('RGBA'))


def cutout(rgba, tol=38):
    """Mask of the robot: from the alpha channel when the picture has one, else away from the border colour."""
    a = rgba[..., 3]
    if (a < 10).mean() > 0.05:
        m = (a > 127).astype(np.uint8)
    else:
        rgb = rgba[..., :3].astype(np.int16)
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = np.median(border, axis=0)
        m = (np.abs(rgb - bg).sum(-1) > tol).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1:
        return m
    big = st[1:, cv2.CC_STAT_AREA].max()
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= big * 0.004:
            keep[lab == i] = 1
    return keep


def fill_holes(m):
    h, w = m.shape
    f = m.copy() * 255
    pad = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(f, pad, (0, 0), 128)
    return ((f != 128)).astype(np.uint8)


def lum(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def region_mask(rgba, fg, spec):
    rgb = rgba[..., :3].astype(np.float32)
    mode = spec.get('mode', 'dark')
    if mode == 'dark':
        m = lum(rgb) < spec.get('thr', 70)
    elif mode == 'light':
        m = lum(rgb) > spec.get('thr', 150)
    elif mode == 'color':
        c = np.array(spec['rgb'], np.float32)
        m = np.sqrt(((rgb - c) ** 2).sum(-1)) < spec.get('tol', 40)
    elif mode == 'hue':
        hsv = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2HSV).astype(np.int16)
        h0, h1 = spec['h']
        m = (hsv[..., 0] >= h0) & (hsv[..., 0] <= h1) & (hsv[..., 1] >= spec.get('s', 80)) & (hsv[..., 2] >= spec.get('v', 60))
    elif mode == 'box':
        m = np.ones(fg.shape, bool)
    else:
        raise ValueError(mode)
    m = (m & (fg > 0)).astype(np.uint8)
    if 'box' in spec:
        x0, y0, x1, y1 = spec['box']
        b = np.zeros_like(m)
        b[y0:y1, x0:x1] = 1
        m &= b
    k = spec.get('close', 5)
    if k:
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    k = spec.get('open', 0)
    if k:
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    n, lab = cv2.connectedComponents(m, connectivity=8)
    sx, sy = spec['seed']
    li = lab[sy, sx]
    if li == 0:
        # nearest labelled pixel to the seed
        ys, xs = np.nonzero(lab)
        if not len(xs):
            raise ValueError(f'nothing matches {spec}')
        j = np.argmin((xs - sx) ** 2 + (ys - sy) ** 2)
        li = lab[ys[j], xs[j]]
    r = (lab == li).astype(np.uint8)
    if spec.get('fill', True):
        r = fill_holes(r)
    return r


class Frame:
    """Pixels to millimetres for one view."""

    def __init__(self, kind, fg, view):
        ys, xs = np.nonzero(fg)
        self.kind = kind
        if kind in ('front', 'side'):
            self.floor = view.get('floor_px', int(ys.max()))
            self.top = view.get('top_px', int(ys.min()))
            self.mm = view['height_mm'] / (self.floor - self.top)
        else:  # top view: along the picture's vertical is the robot's length (or set 'span_px')
            y0, y1 = view.get('span_px', [int(ys.min()), int(ys.max())])
            self.floor, self.top = y1, y0
            self.mm = view['length_mm'] / (y1 - y0)
        # across the picture the scale can come from a published width instead ('width_mm' over
        # 'width_px'), when the height and the width of a picture do not scale alike (perspective)
        self.mmx = view['width_mm'] / view['width_px'] if 'width_mm' in view else self.mm
        self.axis = view.get('axis_px')
        self.flip = view.get('flip', False)

    def set_axis(self, fg, rows_px):
        if self.axis is None:
            cs = []
            for y in rows_px:
                xs = np.nonzero(fg[y])[0]
                if len(xs):
                    cs.append((xs.min() + xs.max()) / 2)
            self.axis = float(np.median(cs))

    def x(self, px):  # across the picture, mm from the centre line
        v = (px - self.axis) * self.mmx
        return -v if self.flip else v

    def y(self, py):  # up the picture, mm from the floor (or from the back, in a top view)
        return (self.floor - py) * self.mm

    def px_y(self, mm):
        return int(round(self.floor - mm / self.mm))


def outline_rows(fg, fr, step_mm, lo_mm, hi_mm):
    rows = []
    mm = lo_mm
    while mm <= hi_mm + 1e-6:
        py = fr.px_y(mm)
        if 0 <= py < fg.shape[0]:
            xs = np.nonzero(fg[py])[0]
            if len(xs):
                a, b = fr.x(xs.min()), fr.x(xs.max())
                rows.append([round(mm, 1), round(min(a, b), 1), round(max(a, b), 1)])
        mm += step_mm
    return rows


def trace(r, fr, eps_mm):
    cs, _ = cv2.findContours(r, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    ap = cv2.approxPolyDP(c, max(0.5, eps_mm / fr.mm), True)[:, 0, :]
    pts = [[round(fr.x(px), 1), round(fr.y(py), 1)] for px, py in ap]
    ys, xs = np.nonzero(r)
    box = [fr.x(xs.min()), fr.y(ys.max()), fr.x(xs.max()), fr.y(ys.min())]
    box = [round(min(box[0], box[2]), 1), round(box[1], 1), round(max(box[0], box[2]), 1), round(box[3], 1)]
    cen = [round(fr.x(xs.mean()), 1), round(fr.y(ys.mean()), 1)]
    return {'outline': pts, 'box': box, 'centre': cen, 'area_mm2': round(float(r.sum()) * fr.mm * fr.mmx)}


def measure_view(name, view, debug=None, tag=''):
    rgba = load(view['src'])
    if 'fg' in view:  # a dark robot on a busy background: everything darker than 'thr' inside 'box'
        x0, y0, x1, y1 = view['fg']['box']
        m = (lum(rgba[..., :3].astype(np.float32)) < view['fg']['thr']).astype(np.uint8)
        b = np.zeros_like(m); b[y0:y1, x0:x1] = 1; m &= b
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        fg = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8) if n > 1 else m
    else:
        fg = cutout(rgba, view.get('tol', 38))
    for x0, y0, x1, y1 in view.get('exclude', []):
        fg[y0:y1, x0:x1] = 0
    fg = fill_holes(fg) if view.get('fill', True) else fg
    kind = view['kind']
    fr = Frame(kind, fg, view)
    lo, hi = view.get('rows_mm', [0, (fr.floor - fr.top) * fr.mm])
    step = view.get('step_mm', 10)
    if kind in ('front', 'top'):
        fr.set_axis(fg, [fr.px_y(v) for v in np.arange(lo, hi, 25.0) if 0 <= fr.px_y(v) < fg.shape[0]])
    else:
        fr.axis = view.get('front_px', 0)  # side view: z measured from this column (towards the front)
    out = {'src': view['src'], 'kind': kind, 'mm_per_px': round(fr.mm, 4), 'mm_per_px_x': round(fr.mmx, 4), 'rows': outline_rows(fg, fr, step, lo, hi), 'regions': {},
           # heights where something was taken out of the outline (a handle, a hose): a check should skip them
           'skip_mm': [[round(fr.y(y1), 1), round(fr.y(y0), 1)] for x0, y0, x1, y1 in view.get('exclude', [])]}
    for rname, spec in view.get('regions', {}).items():
        try:
            r = region_mask(rgba, fg, spec)
            out['regions'][rname] = trace(r, fr, spec.get('eps_mm', 3))
        except Exception as e:  # report and carry on
            print(f'  {tag}{name}.{rname}: {e}', file=sys.stderr)
    # small features read off the picture as pixel boxes: their box and centre in millimetres
    out['marks'] = {}
    for mname, (x0, y0, x1, y1) in view.get('marks', {}).items():
        a, b = fr.x(x0), fr.x(x1)
        out['marks'][mname] = {'box': [round(min(a, b), 1), round(fr.y(y1), 1), round(max(a, b), 1), round(fr.y(y0), 1)],
                               'centre': [round(fr.x((x0 + x1) / 2), 1), round(fr.y((y0 + y1) / 2), 1)]}
    if debug:
        dbg = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2BGR).copy()
        dbg[fg == 0] = (dbg[fg == 0] * 0.35 + np.array([40, 40, 40]) * 0.65).astype(np.uint8)
        cs, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(dbg, cs, -1, (0, 255, 255), max(1, int(2 / max(fr.mm, 0.2))))
        for i, (rname, reg) in enumerate(out['regions'].items()):
            col = [(255, 0, 255), (0, 200, 255), (0, 255, 0), (255, 128, 0), (255, 0, 0), (0, 128, 255)][i % 6]
            pts = np.array([[fr.axis + (p[0] if not fr.flip else -p[0]) / fr.mmx, fr.floor - p[1] / fr.mm] for p in reg['outline']], np.int32)
            cv2.polylines(dbg, [pts], True, col, max(1, int(1.5 / max(fr.mm, 0.2))))
            cx, cy = pts.mean(0).astype(int)
            cv2.putText(dbg, rname, (int(cx), int(cy)), cv2.FONT_HERSHEY_SIMPLEX, max(0.4, 0.5 / fr.mm), col, max(1, int(1 / fr.mm)))
        for mname, (x0, y0, x1, y1) in view.get('marks', {}).items():
            cv2.rectangle(dbg, (x0, y0), (x1, y1), (60, 60, 255), max(1, int(1 / max(fr.mm, 0.2))))
        cv2.imwrite(os.path.join(debug, f'{tag}{name}.jpg'), dbg, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return out


def main(argv):
    debug = None
    if '--debug' in argv:
        i = argv.index('--debug'); debug = argv[i + 1]; del argv[i:i + 2]
        os.makedirs(debug, exist_ok=True)
    cfg = json.load(open(os.path.join(HERE, 'views.json')))
    robots = argv or [k for k in cfg if not k.startswith('_')]
    os.makedirs(OUT, exist_ok=True)
    for rid in robots:
        res = {'robot': rid, 'note': 'Measured from the makers\' pictures by tools/measure/measure.py. Millimetres. Do not edit by hand.', 'views': {}}
        for vname, view in cfg[rid].items():
            if vname.startswith('_'):
                continue
            res['views'][vname] = measure_view(vname, view, debug, f'{rid}-')
            print(f'{rid}.{vname}: {len(res["views"][vname]["rows"])} rows, {len(res["views"][vname]["regions"])} regions, {res["views"][vname]["mm_per_px"]} mm/px')
        with open(os.path.join(OUT, f'{rid}.js'), 'w') as f:
            f.write('// Generated by tools/measure/measure.py from the makers\' pictures (see views.json). Millimetres.\n')
            f.write('// Front views: x to the robot\'s left, y up from the floor. Side views: z towards the front.\n')
            f.write('export default ' + json.dumps(res, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main(sys.argv[1:])
