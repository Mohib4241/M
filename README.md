# Armory

A 3D teardown of two commercial cleaning robots: the **Gausium Phantas** and the **PUDU CC1 Pro**. Pinch or scroll and the robot opens up in waves (shell first, then tanks and sensors, then the deep internals) so you can look at every part, including the water tanks.

Two looks, switched in the top-left panel:

- **Studio** (default): a photographed-product look. Lacquered white shell, smoked glass, rubber, steel, soft shadows on a light floor, a contact shadow that fades as the robot lifts apart, and weighty spring motion. The floor follows the lowest part, so the sealed robot rests on it and open parts float above it.
- **Hologram**: the dark HUD version with glowing outlines, a scan beam and bloom.

Open `dist/index.html` in a browser. It is a single self-contained file (Three.js is bundled in). It needs WebGL; the fonts load from Google Fonts when online and fall back to system fonts offline.

## Hand control (Jarvis mode)

Move the robots with your hands, from your webcam. Click **Start hand control**, allow the camera, and use these gestures (mirror view, like a mirror):

| Gesture | What it does |
| --- | --- |
| Two hands, pull apart or push together | Open or close the suit |
| Pinch (thumb and index) and drag | Orbit the robot |
| Quick pinch | Click: select a part, press a button, set the slider |
| Fist, then open the hand | Open the suit all the way |
| Open hand, then a fist | Close the suit |
| Flick an open palm sideways | Switch between the two robots |

The point between your thumb and index finger is the cursor, drawn as a ring over the viewer. A small picture-in-picture shows the tracked hands and the tracking rate. For best results use good front light, keep your hands 40 to 80 cm from the camera, and avoid a busy background.

### The 3D effect

While hand control runs, your hands appear inside the 3D scene, not just in the corner preview:

- **3D hands**: each hand is drawn as glowing joints and bones with real depth (a hologram in the Hologram look, solid ink and teal in the Studio look). A pinch lights a pulsing orb at your fingertips.
- **Pointing beam**: a ray leaves your wrist and lands on the part you are pointing at, with a ring on its surface.
- **Two-hand tether**: with two hands, a line joins your palms with a live "% open" readout.
- **Camera backdrop** (in-browser camera only): shows your live camera, mirrored, behind the robot, so the robot floats in front of you. The 3D hands line up with your real hands. The video is drawn on your device only and never uploaded. With the Python script the camera picture goes only to the local page (small JPEGs, and only after you click Camera backdrop).
- Starting hand control switches to **Focus view** (panels hidden) so your hands have the whole stage; stopping restores your layout. Toggle **3D hands** and **Camera backdrop** in the dock.

There are two ways to run the tracking. The button picks one for you.

| | In the browser (deployed site, e.g. Render) | Python script (your own computer) |
| --- | --- | --- |
| Where the camera is read | In your browser tab, with MediaPipe running as WebAssembly | By `jarvis.py` with OpenCV |
| Needs Python | No | Yes (3.9 or newer) |
| How to start | Open the site, click Start, allow the camera | `./start.sh` (or `start.bat`), then click Start |
| Needs https | Yes (Render provides it; `localhost` also counts) | No, it serves itself on `localhost` |

A deployed server has no webcam, so a Python script running on Render could not see your hands. That is why the browser mode exists: your camera never leaves your computer. On `localhost` the page tries the Python script first and falls back to the browser camera.

### Test it on your computer first (Python script)

The quick way is one command. It makes its own private Python environment in `.venv` (so it never touches your other Python packages), installs what it needs once, and starts.

macOS or Linux:

```bash
git clone -b ccr-1fec53df-afcwx0 https://github.com/Mohib4241/M.git
cd M
./start.sh
```

Windows (Command Prompt, from the folder you cloned into):

```bat
start.bat
```

You need Python 3.9 or newer. (If pip reports that it cannot find `mediapipe`, your Python is probably too new for it; install Python 3.11 or 3.12 and run again.) The first run takes a few minutes (it downloads about 150 MB of packages, then an 8 MB hand model); later runs start in seconds. If `./start.sh` says permission denied, run `bash start.sh`.

A browser tab opens at `http://localhost:8765`. Click **Start hand control** and allow the camera if your system asks (macOS: allow Terminal under System Settings, Privacy, Camera). The page switches to Focus view, shows the hand preview, and your hands appear as 3D holograms. Click **Camera backdrop** to put your camera behind the robot. This uses the committed `dist/index.html`, so you do not need Node.js.

The bottom-left of the page shows which build you are looking at, for example `Local build · 2026-10-16 20:33 UTC`. With no camera, `./start.sh --demo` plays simulated hands, and `./start.sh --video clip.mp4` plays a recorded clip of your hands through the same tracker.

Paste commands one line at a time, and leave out any `# comment` that follows them. (The script ignores a pasted comment, but other commands in your shell may not.)

### Python script, step by step

If you prefer to manage Python yourself, this is exactly what `start.sh` does:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 jarvis.py
```

On Windows, activate with `.venv\Scripts\activate` and run `python jarvis.py`. The first run downloads a small (about 8 MB) hand model and caches it in `~/.cache/armory-jarvis/`. It works with both the old (`mp.solutions`) and the current (Tasks API) MediaPipe. Installing into a shared environment such as Anaconda `base` works but can change versions of numpy and matplotlib for your other projects, which is why the private `.venv` is the default.

Options: `--demo` (simulated hands, no camera), `--video FILE` (a recorded clip instead of the webcam), `--preview` (also show an OpenCV window), `--camera 1` (another camera), `--port 8766`, `--no-browser`, `--selftest` (check the gesture engine).

Privacy and safety: only the 21 hand points per hand reach the page, never camera frames, except the small mirrored pictures sent when you click **Camera backdrop**. The server listens on `127.0.0.1` only and refuses any page that is not its own, so other websites cannot switch your camera on. The camera turns off when you press Stop or close the tab.

### Deploy on Render

The viewer is a static site, so it deploys as a Render Static Site (no server to run).

1. Push this repo to GitHub (the branch you want to publish).
2. On Render: **New**, **Static Site**, connect the repo and pick the branch.
3. Build Command: `npm install && npm run build`. Publish Directory: `dist`.
4. Create the site. Open the `https://<name>.onrender.com` address, click **Start hand control** and allow the camera.

Or use the Blueprint: **New**, **Blueprint**, select the repo, and Render reads `render.yaml` (same settings, plus a `Permissions-Policy: camera=(self)` header and long caching for the WebAssembly runtime).

What the build does: `npm run build` bundles the viewer into `dist/index.html` and copies the MediaPipe WebAssembly runtime (about 27 MB) into `dist/mediapipe/wasm/`. The hand model (about 8 MB) is fetched from Google's storage the first time you press Start, so the first start takes a few seconds and needs internet access.

| If you see | Do this |
| --- | --- |
| "Camera access is blocked" | Click the camera icon in the address bar and allow it, then press Start again |
| "The camera needs a secure page" | Open the site over `https://` (the Render URL), not `http://` |
| "Hand tracking could not load" | The build did not run (check the Build Command), or the hand model could not be fetched from Google; check the connection |
| "Hand control cannot run in a preview" | Open the site in its own browser tab, not inside an embedded preview |

**Redeployed on Render but nothing changed?** Look at the bottom-left of the page: it says `Render build <7 letters> · <time>`. That commit id must match the latest commit on the branch (`git log -1 --oneline`). If it does not:

1. In Render open the site, **Settings**, and check **Branch** is `ccr-1fec53df-afcwx0` (the `main` branch has only the first commit).
2. Click **Manual Deploy**, then **Clear build cache & deploy**, and wait for **Live**.
3. Hard refresh the page (Ctrl+Shift+R, or Cmd+Shift+R on macOS).
4. The new build shows **3D hands** and **Camera backdrop** buttons in the bottom dock. Nothing 3D appears until you click **Start hand control** and allow the camera.

Tests: `npm test` runs the gesture-engine tests (the same scenarios as `python3 jarvis.py --selftest`) and the race logic tests (roads, driving, the front brake, the drift charge and boost, dust, the club layout, and full laps).

## Controls

| Action | Mouse / trackpad | Touch |
| --- | --- | --- |
| Open or close the suit | Scroll wheel, trackpad pinch, or the slider | Two-finger pinch |
| Orbit | Drag | One-finger drag |
| Fly to a part and read about it | Click it, or pick it in the list | Tap |
| Step through parts | `[` and `]` | Prev / Next in the panel |
| Isolate a system | Group chips in the Parts list | Same |
| Hide the panels | `F` or **Focus view** | Same |
| Reset | `R` or the reset button | Same |

Toggles in the dock: X-ray shell, callouts, **water path** (animated flow from the clean tank, through the pump and brush deck, past the squeegee, into the recovery tank), assembly guides, glow (hologram look only), auto-orbit.

## Race mode

A small game over the same robots. Click **Race mode** in the left panel, choose a robot (the other one is your opponent), look at the five roads, then **Start race**. Each lap is one circuit of a random road, about a minute long, with bends of different tightness. The robot you did not choose races you on every lap. After five laps the most points wins.

| Key | What it does |
| --- | --- |
| `W` | Go (throttle) |
| `S` | Front brake: slows the robot and holds it at a stop. It does not reverse |
| `A` / `D` | Steer left / right |
| `Space` | Drift brake: the rear lets go, so you can slide round a bend. Hold it in a slide to charge a boost, let go to use it |
| `Shift` (or `Ctrl`, or `Command`) | Pick up dust. Hold it over the dust in front of the robot; the grains go into the tank (150 at most) |
| `G` | Graphics setting: Auto, High, Medium, Low (see below) |
| `P` | Show or hide the frame rate (and the render resolution) |
| `Esc` | Pause |

Points: 3 for first place on a lap, 1 for second, and 1 for every 50 grains of dust in the tank. The lap card and the final table show each lap.

**Drifting.** While the rear slides with `Space` held, a drift charge builds. The tyre trails change colour as it reaches each tier: blue, then amber, then pink. Let go of `Space` and the charge becomes a short boost (tier 1: 1.2 s, tier 2: 1.6 s, tier 3: 2.0 s) with flames from the tail. A drift also gives tyre smoke, skid marks that fade, a squealing tyre sound, and sparks when a wheel scrapes the kerb. The opponent never drifts or boosts.

**The setting** is a night-time racing club: concrete barriers with chase lights, a start gantry, pit garages, grandstands full of spectators, a clubhouse and control tower in the infield, floodlight masts and a lit skyline. It is placed around each random road by distance from the track, so it fits every shape of loop. Sound is made in the browser (no audio files), so the first sound waits for your first key press or click.

**Graphics.** The race is drawn into a floating-point (HDR) buffer, so neon, lamps, flames and sparks can be brighter than white and glow through a bloom pass. The robots are glossy race-painted copies of the same models (a body colour, dark trim, a number roundel and a side stripe), with headlights that throw a beam and a pool of light on the road, tail lights that brighten under the front brake, and an underglow. Their paint mirrors the club through a small reflection map drawn from just above the start line. At speed there is a soft radial blur, a colour split during a boost, and a vignette.

`G` steps the setting through Auto, High, Medium and Low, and the choice is remembered in the browser (`armory-gfx`). **High** adds bloom, sharper pixels and a large shadow map. **Medium** drops bloom. **Low** drops all post-processing. **Auto** starts on High and, like the dynamic resolution of a console game, reacts to a sagging frame rate in two stages. First it draws fewer pixels (85%, then 70% of the width and height) and lets the browser stretch them, which keeps the look and the bloom; this starts when the frame rate stays under 52 for 1.2 seconds. Only if it is still under 28 at 70% does it drop a level. While a lower scale holds a steady 57 or more it tries the next scale up (after 20 seconds, and after twice as long each time a try fails), so one stutter does not leave the picture soft for good. The first 2.5 seconds are ignored. The rule is in `game/quality.js` and is tested without a GPU. Press `P` to see the frame rate and the current render resolution.

**Smooth on fast screens.** The race steps at 60 Hz, but each frame draws the state between the last two steps (`game/interp.js`), so a 120 or 144 Hz screen shows smooth motion instead of the same picture two or three times. The cost is one step (about 16 ms) of delay. The frame loop itself is not capped: it runs at the screen's refresh rate.

**Camera.** A close chase camera sits above and behind the robot and looks well down the road, so the robot rides low in the frame and the bend ahead shows. It follows where the robot is going more than where it points, so in a drift the robot swings round in front of it and shows its side. It pulls back and widens as speed builds, widens and shakes slightly under a boost, and the menu screen turns slowly round the robot instead. The numbers are in `game/chasecam.js`.

**Body colour.** On the robot screen, under the two robots, choose Classic (each robot's own colour), White or Black. The robot turns beside the menu card so the change shows at once. The choice applies to your robot (the opponent keeps its own paint) and is remembered in the browser (`armory-paint`).

The game is a stylised model, not the real robot. Both robots drive the same way, with a top speed of 1.3 m/s, close to the CC1 Pro's published 1.2 m/s. It needs a keyboard, so it does not run on phones.

## Where the data comes from

Part names, capacities and specs come from published spec sheets, manuals, parts catalogs and retailer listings. Each part carries one of three confidence tags in the panel:

- **Published spec**: name and key numbers appear in spec sheets or manuals.
- **Named in catalog**: the part is named in a manual or parts list; size and position are schematic.
- **Inferred**: standard for this class of machine, not itemised in the sources reached.

The shapes and where parts sit inside are a **schematic reconstruction, not CAD**. Neither manufacturer publishes an exploded 3D model.

The manufacturer sites (`gausium.com`, `academy.pudutech.com`) and the retailer and manual hosts were blocked by the network policy of the environment this was built in, so the facts were gathered from search-result summaries of those pages rather than from reading them in full. That includes `gausium.com/products/phantas/`, whose real photos could not be opened. The Phantas shape follows what the sources describe (compact, rounded, monochrome body, wavy-stripe front shell, integrated handle) but is not traced from product images. The full source list is inside the app (right panel, Sources) and in `src/data/shared.js`. Where sources disagree (for example the CC1 Pro's 15 L vs the base CC1's 17 L tank) the panel says so.

## Develop

```bash
npm install
npm run build      # writes dist/index.html and dist/armory.artifact.html
npm run dev        # rebuilds on change
npm run serve      # static server on :5173
```

```
src/
  main.js        UI wiring: parts list, detail panel, dock, callout leader lines
  stage.js       3D engine: both looks (studio cove + shadows, hologram platform + bloom),
                 spring explode timeline, camera fit, picking, dimming, guides, water flow,
                 pinch/scroll input
  kit.js         Builder API, material presets for both looks, moulded-panel geometry
  lib.js         Reusable components (wheel, roller, tank, LiDAR, pump, ...)
  data/          One file per robot: parts, geometry, explode vectors, specs, sources
  jarvis.js      Hand control client: picks the source, reticle cursor, picture-in-picture
  hands3d.js     3D holographic hands, pointing beam, two-hand tether (in the scene)
  handcam.js     In-browser camera + MediaPipe (WebAssembly) tracker
  gestures.js    Gesture engine (JavaScript port of the one in jarvis.py)
  game/          Race mode: track.js (random roads), car.js (tyre grip), drift.js (drift
                 charge and boost), ai.js (opponent), dust.js (vacuum), race.js (lap
                 rules), club.js (where the racing club goes), clubscene.js (the club's
                 meshes), fx.js (smoke, trails, sparks, flames), textures.js (drawn
                 textures), audio.js (synthesised sound), scene3d.js and models.js (the
                 scene and the robots as cars), livery.js (race paint, lights, decals),
                 post.js (bloom and speed pass), quality.js (graphics level and render scale),
                 chasecam.js (camera maths), interp.js (drawing between steps),
                 index.js (screens, HUD, loop)
  body.html, style.css
jarvis.py        Hand tracking server (MediaPipe) and gesture engine, for local use
start.sh/.bat    One-command launcher: private .venv, install once, run jarvis.py
tests/           Gesture engine tests
render.yaml      Render Blueprint (static site)
```

Race mode has a test hook: open the page with `?racedebug` (for example `dist/index.html?racedebug=1`) and `window.__raceDbg` exposes the live race (`S.race`, `S.scene`, the renderer, the key reader and the line-following driver), so a script can step a whole lap without waiting for frames. In a script, `window.__armoryNoAdapt = true` (set before the page loads) turns off the automatic graphics step-down, so slow software rendering does not change the picture mid-test.

To add a part, add an object to a robot's `parts` array with a `home` position, an `ex` explode offset, a `layer` (0 outermost to 3 innermost) and a `build(b)` function. To add a robot, create a data file like `data/phantas.js` and register it in `main.js`.
