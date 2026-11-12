# Catalogue

A 3D teardown of 20 commercial and facility robots, sorted by where they work (**indoor**, **outdoor** or both) and by what they do. Six clean floors: the **Gausium Phantas**, **Omnie** and **Marvel**, and the **PUDU CC1 Pro**, **MT1** and **MT1 Max**. Thirteen come from a product deck: facade and solar cleaners, duct and pipe crawlers, an inspection robot and security patrol robots (see *Indoor, outdoor and categories* below). One is a humanoid, the **Unitree G1**, which copies your whole body in camera mode (see *Whole-body tracking*). Pinch or scroll and the robot opens up in waves (shell first, then tanks and sensors, then the deep internals) so you can look at every part, including the water tanks.

Two looks, switched in the top-left panel:

- **Studio** (default): a photographed-product look. Each robot in its own finish (the Phantas in black lacquer, the CC1 Pro in slate grey over a black base), smoked glass, rubber, steel, soft shadows on a light floor, a contact shadow that fades as the robot lifts apart, and weighty spring motion. The floor follows the lowest part, so the sealed robot rests on it and open parts float above it.
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
| Flick an open palm sideways | Switch to the next robot |

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

On Windows, activate with `.venv\Scripts\activate` and run `python jarvis.py`. The first run downloads a small (about 8 MB) hand model and caches it in `~/.cache/catalogue-jarvis/`. It works with both the old (`mp.solutions`) and the current (Tasks API) MediaPipe. Installing into a shared environment such as Anaconda `base` works but can change versions of numpy and matplotlib for your other projects, which is why the private `.venv` is the default.

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

Tests: `npm test` runs the gesture-engine tests (the same scenarios as `python3 jarvis.py --selftest`), the race logic tests (roads, driving, the front brake, the drift charge and boost, dust, the club layout, and full laps) and the interruption data tests (every alarm has a type, every type points at real parts on every robot, the counts add up), the guide tests (every step points at real parts, the jam is shown and then cleared) and the touch-control test.

## Whole-body tracking (the humanoid)

Open the **Unitree G1** (Humanoid robots), press **Start hand control**, and leave **Track my whole body** on. The camera then follows your whole body instead of your hands, and the robot copies you like a mirror:

- **Head:** look up, down, left or right, or tilt it to a shoulder, and its head does the same (up to 60°).
- **Arms and hands:** raise an arm and the arm on the same side of the screen goes up; bend your elbow and its elbow bends (up to 150°); bend your wrist and its hand bends (up to 80°).
- **Body:** turn, and the whole robot turns with you, all the way round; lean and it leans; twist at the waist and its chest turns over its hips.
- **Legs and feet:** each leg is followed on its own (lift a knee, step, squat), each foot points where yours points, and the hips come down when you bend both knees so the feet stay on the floor.
- **Where you stand:** step sideways, closer or back and the robot steps the same way across the view. The place you stand in the first moment is the starting point; leave the picture for two seconds and it starts again from where you come back.

The panel next to the robot shows a stick figure of what the camera sees and six lights: **Head, Arms, Hands, Body, Legs, Feet**. A light is on while that region is tracked. Whatever the camera cannot see (legs under a desk, a hand out of the picture) stands still instead of guessing, so stand back until all six are lit.

Switch **Track my whole body** off to go back to hand gestures (pinch, orbit, open) on the humanoid. The tracking uses the camera in this browser; when the page is served by the Python script, which tracks hands only, the button says so.

How it works: `src/mirror.js` turns the tracker's 33 body points into one rotation per joint (pure maths, tested in `tests/mirror.test.mjs` with made-up bodies). Anything the tracker is unsure of (visibility under 0.5) rests instead of guessing. The G1's data file gives its joints (`rig`) and each part names the joint it moves with; `place` and `moveFrom` turn where your trunk is in the picture, and how big it looks, into a step for the robot. `Stage.setPose` moves the parts, smoothly, and puts the robot back at rest when you open it up, so the teardown stays clean. Any robot can be given a `rig` the same way.

## Smooth camera mode

Hand and body tracking run in a **worker**, off the page's own thread: the 3D view never waits for a model. The page sends the next camera picture only when the answer to the last one is back, so nothing queues up, and at most about 30 pictures a second are read. Measured here with a video as the webcam and the 3D view paused, the page kept 54 to 60 frames a second with tracking on; with the model on the page (how it was before) it fell to 16.

- The model starts on the CPU inside the worker, which leaves the graphics chip to the 3D view. If the CPU is slow (over 55 ms a picture) it tries the graphics chip once and keeps whichever is faster.
- Where a browser cannot run the tracker in a worker, it runs on the page at a reduced rate, leaving the view most of the time.
- `tools/audit.mjs` lists every robot's triangle count; the heaviest is about 106,000, and finding the part under the cursor takes about 1 ms at most.

## Audit against the makers' sizes

`node tools/audit.mjs` measures every model's own box from its triangles and compares it with the size its maker publishes (`dims` in each data file, in millimetres). `npm test` fails if a model is more than 6% or 25 mm off. Parts that are not in a maker's measure (hoses, cables, a control case, soft brushes, a raised arm) are listed in `dimsSkip`. Where a maker's own picture and its sheet disagree and the model follows the picture, `dimsKnown` gives the reason (the Phantas skirt and height, the Marvel's foot).

The first run of this audit found and fixed: the Go2 36% too wide (legs set too far out), the K20 a quarter too short, the G-31's tracks too far apart, the KT-976 and the G1 a little wide, the J1 too thick, and two CC1 Pro parts that stuck out past its published length. `node tools/audit.mjs <id>` prints the box of each part of one robot, to find what sticks out.

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
| Point at where an interruption comes from | **Interruptions** dropdown (left panel) | Same |

Toggles in the dock: X-ray shell, callouts, **water path** (animated flow from the clean tank, through the pump and brush deck, past the squeegee, into the recovery tank), assembly guides, glow (hologram look only), auto-orbit.

## Interruptions

The left panel has an **Interruptions** dropdown with every kind of interruption recorded for the fleet: 14 types (19 alarm codes) in 6 categories (Notice, Maintenance, Suction/airflow, Navigation interference, Location lost, Sensor error), from 827 recorded events. Each entry shows its alarm code, a bar and a count. Choose one and the open robot points at where it comes from:

- the part (or parts) **glow and pulse** in the category's colour, with a halo, ripples and a pin; related parts glow softly; everything else steps back;
- the suit opens far enough to show it, and the camera frames it;
- a banner on the stage names the **section** (for example Water system) and the **part** (Recovery tank), and a glowing callout with a leader line sits on the part;
- the details panel shows the card: why it happens, where on the robot, how often it was recorded, the typical and the longest alarm, and the alarm wording and codes;
- it works the other way round too: a part's own panel lists the interruptions that come from it, and choosing one there makes it glow.

The choice carries over when you switch robot or look, so you can compare the two robots. Keyboard: arrow keys, `Home`, `End` and `Enter` in the list, `Esc` to close it, and `Esc` again to put the glow away.

Notes on the figures:

- The counts and alarm lengths are pooled over the whole fleet, so every robot shows the same figures for the same interruption.
- The recorded data names the alarm, not the part. Which part an alarm points to is a mapping written by hand in `src/data/interruptions.js`, by what each part does. Where a robot has no part of exactly that kind (the CC1 Pro has no anti-drop sensor, the Omnie has a debris tray rather than a dust bag, no robot has a separate suction pipe), the nearest part is used and marked "Nearest match".
- Alarm length is the time the alarm stayed open, not necessarily downtime. A few alarms stayed open for days (the longest is about 167 hours), so the card shows the median and the longest, not an average.
- Dates are not used.
- Only aggregates are published: alarm code, category, wording and alarm lengths. Site names, robot serial numbers, robot models and time stamps are not in the page or the repository.

To use newer data: `pip install openpyxl`, then `python3 scripts/interruptions_from_xlsx.py path/to/export.xlsx` rewrites `src/data/interruption-stats.js`, and `npm run build`. A new alarm code needs a line in `TYPES` in `src/data/interruptions.js` (the tests fail until every code has a type and every type points at real parts on every robot).

## Guides: troubleshooting and maintenance

Under **Guides** in the left panel, step-by-step guides for the Phantas, animated on the 3D robot with no sound: one short line of text per step, written over the picture. Each step makes its parts glow, tips the robot back so the underside faces you, slides the brush out, and shows the jammed debris and its removal. A guide plays itself when opened; **Pause**, **Back** and **Next** (or the arrow keys) take over.

- **Debris tray stuck** (troubleshooting): debris wedged in the channel behind the front roller brush, in front of the debris tray. Stop the robot, tip it back, open the side cover, slide the brush out, clear the channel, empty the tray, refit and test.
- **Change the roller brush** (maintenance): the same way in, the old brush out, the bay wiped, the new brush in, and a test.

The steps follow what was done on site on 4 November 2026 (`src/data/guides.js`); the site video itself is not in the page. The maker's manual could not be checked when they were written, so each card says so. The CC1 Pro has no guides yet.

## Race mode

A small game over the same robots. Click **Race mode** in the left panel, choose your robot, look at the five roads, then **Start race**. Each lap is one circuit of a random road, about a minute long, with bends of different tightness. **Every other robot races you on every lap.** They line up on a staggered grid like a racing game, two lanes, each robot a little behind the one before, and you start at the back. Each opponent has its own pace and line, and every robot can bump every other one (bigger robots shove harder). After five laps the most points wins.

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

**On a phone, a tablet or a small window** (up to 900 px wide, or any touch screen) the race shows buttons on screen: left and right on the left thumb, **Go** (accelerator) and **Brake** on the right, with **Drift** and **Dust** above them. Each button follows its own finger, so you can steer and hold Go at once. The **Graphics** button and a **Pause** button sit at the top. Starting a race asks for full screen in landscape; where the browser will not turn the screen (iPhone), a phone held upright shows the race on its side. Phones start on Medium graphics, and the panels over the race have no blur behind them, which keeps the frame rate up.

Points by place on each lap: 10, 7, 5, 3, 2 and 1, plus 1 for every 50 grains of dust in your tank. The lap card ranks every robot, and the final table ranks them on total points. The HUD shows your place in the field (for example 4th / 6) and how far the robot just ahead of you is. A lap closes when everyone is home, or 12 seconds after you finish (robots still out are not finished).

**Drifting.** While the rear slides with `Space` held, a drift charge builds. The tyre trails change colour as it reaches each tier: blue, then amber, then pink. Let go of `Space` and the charge becomes a short boost (tier 1: 1.2 s, tier 2: 1.6 s, tier 3: 2.0 s) with flames from the tail. A drift also gives tyre smoke, skid marks that fade, a squealing tyre sound, and sparks when a wheel scrapes the kerb. The opponent never drifts or boosts.

**The setting** is a night-time racing club: concrete barriers with chase lights, a start gantry, pit garages, grandstands full of spectators, a clubhouse and control tower in the infield, floodlight masts and a lit skyline. It is placed around each random road by distance from the track, so it fits every shape of loop. Sound is made in the browser (no audio files), so the first sound waits for your first key press or click.

**Graphics.** The race is drawn into a floating-point (HDR) buffer, so neon, lamps, flames and sparks can be brighter than white and glow through a bloom pass. The robots are glossy race-painted copies of the same models (a body colour, dark trim, a number roundel and a side stripe), with headlights that throw a beam and a pool of light on the road, tail lights that brighten under the front brake, and an underglow. Their paint mirrors the club through a small reflection map drawn from just above the start line. At speed there is a soft radial blur, a colour split during a boost, and a vignette.

`G` steps the setting through Auto, High, Medium and Low, and the choice is remembered in the browser (`catalogue-gfx`). **High** adds bloom, sharper pixels and a large shadow map. **Medium** drops bloom. **Low** drops all post-processing. **Auto** starts on High and, like the dynamic resolution of a console game, reacts to a sagging frame rate in two stages. First it draws fewer pixels (85%, then 70% of the width and height) and lets the browser stretch them, which keeps the look and the bloom; this starts when the frame rate stays under 52 for 1.2 seconds. Only if it is still under 28 at 70% does it drop a level. While a lower scale holds a steady 57 or more it tries the next scale up (after 20 seconds, and after twice as long each time a try fails), so one stutter does not leave the picture soft for good. The first 2.5 seconds are ignored. The rule is in `game/quality.js` and is tested without a GPU. Press `P` to see the frame rate and the current render resolution.

**Smooth on fast screens.** The race steps at 60 Hz, but each frame draws the state between the last two steps (`game/interp.js`), so a 120 or 144 Hz screen shows smooth motion instead of the same picture two or three times. The cost is one step (about 16 ms) of delay. The frame loop itself is not capped: it runs at the screen's refresh rate.

**Camera.** A close chase camera sits above and behind the robot and looks well down the road, so the robot rides low in the frame and the bend ahead shows. It follows where the robot is going more than where it points, so in a drift the robot swings round in front of it and shows its side. It pulls back and widens as speed builds, widens and shakes slightly under a boost, and the menu screen turns slowly round the robot instead. The numbers are in `game/chasecam.js`.

**Body colour.** On the robot screen, under the robots, choose Classic (each robot's own colour), White or Black. The robot turns beside the menu card so the change shows at once. The choice applies to your robot (the opponent keeps its own paint) and is remembered in the browser (`catalogue-paint`).

The game is a stylised model, not the real robot. All robots drive the same way, with a top speed of 1.3 m/s, close to the CC1 Pro's published 1.2 m/s. On phones and small windows it has buttons on screen.

## Indoor, outdoor and categories

Every robot has two labels, and a short written profile that says where it fits.

- **Where it works**: **Indoor**, **Outdoor**, or both. The robot list in the left panel has a switch, **All · Indoor · Outdoor**, with a count on each. A robot that works in both (the MT1 Max, the Go2 and the Guard R) shows under each. The choice is remembered.
- **What it does**: the robots sit in categories, each with a line that says what that kind of robot does and where it fits. The category names are the product deck's.
- **Where it fits** (right panel, under the robot's name): the environment tag or tags, the category, a paragraph on where it works with the numbers that matter there, three points to know and **why** it has that tag. The three points of the deck robots are the deck's own wording.

| Category | Robots | Works |
| --- | --- | --- |
| Floor cleaning | Gausium Phantas, Omnie, Marvel · PUDU CC1 Pro, MT1 · PUDU MT1 Max | Indoor (the MT1 Max also outdoor) |
| Facade cleaning | X-Human K3, X-Human J1 | Outdoor |
| Solar panel cleaning | X-Human G2 | Outdoor |
| Duct cleaning · Air | Kuaitong KT-976 · RJ Bots Q38, Q40, Q50 | Indoor |
| Duct cleaning · Grease | RJ Bots G-31 | Indoor |
| Duct cleaning · Sewer | RJ Bots K20 | Outdoor (underground) |
| Inspection robots | Unitree Go2 | Indoor and outdoor |
| Humanoid robots | Unitree G1 | Indoor |
| Security patrolling | SMP Robotics S5 PTZ (outdoor) · NWS Guard R (both) | Outdoor / both |
| Patrolling robots | SMP Robotics S5.2 PTZ | Outdoor |

A tag is only given where a source supports it, and the profile says which: a facade or a solar panel is outside a building, a duct is inside one, the MT1 Max is titled an outdoor and semi-outdoor sweeper by PUDU, and NWS says the Guard R is built for indoor and outdoor use. The MT1 is tagged indoor because PUDU lists car parks, warehouses and factories and gives it no weather rating; its outdoor model is the MT1 Max. If you know better, change `env` in `src/data/catalogue.js` and the test in `tests/catalogue.test.mjs` will tell you if a kind of job and its setting no longer agree.

### The 13 robots from the product deck

Each one has a teardown like the floor cleaners: parts that lift off in order, a label and a description for each part, its published numbers, and its sources (right panel, Sources). The outside follows the picture in the deck; where parts sit inside is a schematic reconstruction, not CAD.

- **Numbers** come from the makers' own pages and data sheets: X-Human's K3, J1 and G2 pages, Kuaitong's KT-976 data sheet, RJ-Bot's Q38, Q40, Q50, G31 and K20 pages, Unitree's Go2 page, SMP Robotics' S5 PTZ data sheet and S5.2 brochure, and NWS Digital's Guard R page.
- **Sizes**: every robot but three has a size its maker publishes, and the models use it: the K3 (1,377 × 1,000 × 288 mm), J1 (800 × 800 × 300 mm) and G2 (1,205 × 1,305 × 500 mm) from X-Human's own pages, the KT-976, the Q50, the G-31 (445 × 250 mm), the K20 and the Go2 from their makers' sheets, and SMP's two robots from the dimensioned drawings in the data sheet and the brochure. RJ Bots' Q38 and Q40 and the NWS Guard R publish none, so those models are scaled from their pictures and say so in their notes and in the Size row. Treat their size as a picture, not a measurement.
- **Names**: the deck's "G02" is Unitree's **Go2**, and "S5.2TPZ" is SMP's **S5.2 PTZ**. The deck's K20 is RJ-Bot's own crawler.
- **Disagreements** are shown, not hidden: Kuaitong's pages disagree on the KT-976's weight (the data sheet table is used); RJ-Bot's G31 page says IP65 where a feature picture says IP68, and its Q50 page and pictures give two duct ranges; RJ-Bot's current K20 is a six-wheel drive while the deck's picture shows four wheels (the model follows the picture); X-Human's pages give the J1 two working heights; several figures on a distributor's page for X-Human are for its robots in general (said where it matters).
- **Pictures that do not match the makers' pages**: the makers' own pages show that three of the deck's pictures belong to other labels. Kuaitong's KT-976 page carries pictures of a black four-wheel robot, while the deck's KT 976 (yellow tracks) is the machine on RJ-Bot's Q40 page; RJ-Bot's Q38 page shows the blue four-wheel robot the deck uses for the Q40; and the deck's Guard R photo matches NWS's pictures of its "Guard RL" version. The models follow the deck's pictures, as asked; the notes of each robot say so.
- **Part names**: where a maker labels a part (Unitree's Go2 picture names twelve; RJ-Bot's K20 drawing names the camera head, the lift arm and the aviation plug; X-Human names the K3's safety rope, battery and water tank) the part is marked as a published spec, otherwise as named in the catalogue or inferred, and the part says what is read from the picture.
- **Not in the picture**: a part that belongs to the system but is not in the deck's picture is left out and named in the robot's notes: the KT-976's main unit, the Q38's control box, the K20's cable reel, the G31's high-pressure unit.
- They are not floor cleaners, so they do not race, have no docking station and have no interruption list or guides (`race: false` and `noDock: true` in their data files; the race and those lists are for the six floor cleaners).

### Add a robot

1. Write `src/data/<id>.js`, copying the closest existing robot. The builders for crawler tracks, round brushes, hoses, control cases, off-road wheels and the like are in `src/field.js`; `src/lib.js` has the cleaning-robot parts (tanks, LiDAR, cameras, boards).
2. Register it in `src/data/robots.js`.
3. Add its profile to `src/data/catalogue.js`: `env`, `category`, the name on its button, one line on what it is, a paragraph on where it fits, three points and the reason for the tag.
4. Add any new sources to `src/data/shared.js`.
5. Run `npm test`: it checks every part, every source, the profile and the setting that goes with the job.

## Where the data comes from

Part names, capacities and specs come from published spec sheets, manuals, parts catalogs and retailer listings. Each part carries one of three confidence tags in the panel:

- **Published spec**: name and key numbers appear in spec sheets or manuals.
- **Named in catalog**: the part is named in a manual or parts list; size and position are schematic.
- **Inferred**: standard for this class of machine, not itemised in the sources reached.

The **outside of every robot is measured from its maker's own pictures** (see *Measured from the makers' pictures* below). Where parts sit **inside** is a schematic reconstruction, not CAD: neither manufacturer publishes an exploded 3D model.

The photographs supplied for this project (listed as a source in the app) still decide what the makers' pictures cannot show: the depth of the Phantas and the CC1 Pro, the colours of the units photographed (the CC1 Pro here is the dark slate one; PUDU also sells it in white and lime, which is the colour of its front picture), the Phantas screen's two-eyed idle face, and the two docking stations.

The manufacturer sites (`gausium.com`, `www.pudurobotics.com`, `academy.pudutech.com`) and the retailer and manual hosts were blocked by the network policy of the environment this was built in, so the facts were gathered from search-result summaries of those pages rather than from reading them in full. The full source list is inside the app (right panel, Sources) and in `src/data/shared.js`. Where sources disagree (for example the CC1 Pro's 15 L vs the base CC1's 17 L tank) the panel says so.

## Gausium Omnie

The Omnie is shown in its roller-brush version, built from Gausium's specification page, its brochure (EN, 2025-11-14), a distributor sheet and Gausium's product pictures (`src/data/omnie.js`). Published figures: 810 x 700 x 1,070 mm, 148 kg (157 kg with disc brushes), 33 L clean and 24 L waste water, 60 Ah 24 V lithium iron phosphate battery (3 h scrubbing, 8 h sweeping or dust mopping, about 2 h to charge), dual roller brushes 406 mm wide, 780 mm with the two side brushes, a built-in debris tray, up to 1.4 m/s, and a 3D LiDAR, a 2D LiDAR, a 3D depth camera, an RGB camera, anti-collision and anti-drop sensing.

The outside follows the pictures: a silver body that leans in a little towards a black collar and round top with a flat dark panel and the red emergency stop, a camera pod at the front top, a wide dark front panel, a rear handle, and a rounded black base. What sits behind the top and front panels is not stated, and which lens in the pod is the 3D LiDAR is our reading. No dock or workstation is listed with the Omnie, so none is shown, and there are no guides for it yet.

## Gausium Marvel, PUDU MT1 and MT1 Max

**Marvel** (`src/data/marvel.js`) follows Gausium's specification page, brochure (EN, 2026-09-22) and product pictures from Gausium's Marvel page (front, side and top views): 1,108 x 699 x 1,168 mm, 220 kg, 80 L clean and 70 L self-cleaning waste water, 120 Ah lithium iron phosphate battery, scrubbing 600 mm, sweeping 840 mm and dust mopping 760 mm wide, sweeping and scrubbing at once, two front side brushes and a 3D LiDAR. The outside follows the pictures: a tall tower whose rounded silver sides slant back to a black rear body, a black carbon-weave front panel with the maker's mark and a camera slot, a black visor with the sensor dome and two white light strips, a flat lid with the stop, a push handle at the rear, a drain hose with a yellow cap, a wide silver base with a bumper strip, the two side brushes and a blue dust mop across the front. The sources name only the 3D LiDAR among its sensors, so the others, the brush types, the hopper and the squeegee are marked inferred.

**MT1** and **MT1 Max** (`src/data/mt1.js`, one build for both) are robotic sweepers with no water system. Their numbers come from PUDU's own product pages first (the specification tables), then PUDU's MT1 product presentation and user manual, PUDU's launch release for the Max and retailer listings: MT1 840 x 600 x 490 mm, 65 kg, 35 L bin, 70 cm wide, 1,800 m²/h (6,000 in spot mode), 4 to 8 h, under 3 h to charge; MT1 Max 840 x 600 x 675 mm, 85 kg, 35 L bin, 70 cm with side brush, 2,200 m²/h (7,000 spot), 60 Ah, 5 to 10 h, under 3.5 h to charge, IP54. PUDU lists 3 RGBD sensors, 1 LiDAR, 2 front-view cameras and a fish-eye camera, dual disc brushes with AI trash recognition, an extendable steering handle, and for the Max a 3D LiDAR, a 1.2 m warning light with a safety projection light and a dual-chip computer. The outside follows PUDU's product pictures: an all-black body with a rounded hood carrying a white light bar, a tall camera window and square corner windows, a wide front lip over two long-bristle disc brushes, large grey-hubbed wheels behind the middle, a flat deck with the status screen and the stop at the rear, the steering handle folded round the deck and a lime-green latch on each side; the Max adds the LiDAR tower with its yellow-and-black ring and three-lens sensor bar, and the warning light on its pole. The 45 Ah battery of the MT1 is a retailer's figure (it is not on PUDU's page). Water alarms point at their bin (or their filter and fan, for a blocked suction) as the nearest match. PUDU's optional Auto-Empty Station is named on the cards but not modelled. None of the three has a guide yet.

## Measured from the makers' pictures

Every robot's shell is built from measurements taken off its maker's pictures, not drawn by eye:

1. **`tools/measure/measure.py`** downloads each picture listed in `tools/measure/views.json`: Gausium's straight-on front views of the Phantas, Omnie and Marvel, PUDU's front views of the CC1 Pro, MT1 and MT1 Max, and PUDU's top view of the MT1. It cuts the robot out (from the picture's transparency, or from a plain or dark background), sets the scale from a published size (the height, and where perspective makes width and height scale differently, also the width), and writes, in millimetres:
   - the **outline**: the left and right edge every 10 mm of height (and, for a top view, every 20 mm of length);
   - **regions** traced from a seed point and a colour rule, such as the Marvel's carbon panel and visor, the Omnie's dark panel, camera housing and the silver front with its U cut-out, and the CC1 Pro's screen and camera pod;
   - **marks** read off as boxes for the small parts: lamps, light bars, slots, cameras, lenses, sensors, stop buttons, logos, grilles, keys, pads, casters and brushes.

   The results are in `src/data/shapes/<robot>.js`. Run it again with `python3 tools/measure/measure.py [robot …] --debug DIR` (it needs numpy, opencv-python-headless and pillow); `--debug` writes each picture with what was traced drawn over it.
2. **`src/loft.js`** builds a body from those rows: a stack of rounded sections, one per height, with the measured width, a front and back line from the side pictures and corner rounding from the top views. The shell is cut out of that surface as panels with a thickness (front, sides, rear, lid, base), so it still comes apart part by part, and every detail is set on the curved surface at its measured place (`loft.place`).
3. **`tests/shapes.test.mjs`** projects every built robot onto the front plane and compares its outline with the measured one at every height. Today the mean difference is 2 mm (Phantas), 4 mm (CC1 Pro), 2 mm (Omnie), 4 mm (Marvel), 5 mm (MT1) and 9 mm (MT1 Max); the test fails above 10 mm on average or 30 mm anywhere. `node tools/check-shapes.mjs` prints the same figures.

What each picture gave:

- **Marvel**: the body narrows from 708 mm at the foot to the shoulders; the carbon panel is 420 mm wide at the top, tapering, with rounded lower corners; the visor, its light strips, dome, sensors and pill window, the camera slot, the lower recess, the corner pads and the bar with two yellow sensor marks, the grips at the rear corners that stick out past the sides, the brushes and the mop are all at their measured places. The silver pillars end a quarter of the way back along the sides, where the black rear panels begin; their lower edge slants (Gausium's 3/4 pictures).
- **Omnie**: the silver front with the U cut for the camera housing and the notch for the dark panel, the round black head with its side tabs, the sensor bumps on the sides and the base with its posts, grooves and lip. Gausium's front picture was taken from about 9° above, so above 985 mm it shows the top of the head; the rows stop there and the head's rounded top is set from the 1,070 mm height.
- **Phantas**: a 484 mm skirt and a 426 mm body whose shoulders round in to the lid, the head band with the pull-handle recess and its sensor strip, the speaker grilles at the corners, the sensor window with two lenses, the label field and the skirt's slot windows. The picture's own proportions put the robot at about 585 mm tall with the LiDAR, a little under Gausium's 619 mm.
- **CC1 Pro**: a 568 mm plinth, a dark gap, and a body that narrows from 505 mm to 441 mm under the lid; the 357 mm face screen with PUDU's two-eyed face, the sensors at its lower corners with a camera between them, the camera pod and the ultrasonic pairs.
- **MT1 and MT1 Max**: each from its own front picture: the 600 mm lip, the hood's width at every height (its nose curving back into the deck as in PUDU's side pictures), the light bar, slots, camera window and corner windows; for the Max the LiDAR tower, its hazard ring, the three-lens bar, the stop button and the warning light's pole and lamp. PUDU's top view of the MT1 gives the plan: the front rounding in, a body about 540 mm wide, the screen and stop button in the rear half of the deck and the fish-eye camera on the hood. These pictures were taken from a little above, so heights scale from the published height and widths from the 600 mm lip.

## Smooth on every screen

The viewer keeps its frame rate up on laptops and phones:

- **Fewer draw calls.** Inside each part, the pieces that share a finish are merged into one mesh (and their outlines into one set of lines), which more than halves the draw calls (the Phantas goes from 626 to 294 a frame). Spinning, liquid and instanced pieces stay separate, and picking, dimming and the glow work as before.
- **Solid where it can be.** Surfaces that are not see-through draw in the solid pass, which skips hidden pixels; only glass, water, X-rayed or dimmed parts use the see-through pass. Outlines that are hidden are not drawn at all.
- **Shadows only when something moves.** The shadow map is redrawn when a part moves, not every frame, so orbiting round a still robot costs one pass less.
- **Resolution that follows the frame rate.** Every second the viewer checks the frame rate: under 42 fps it draws fewer pixels (in steps down to 75%), and when it holds 55 fps or more it steps back up. If even that is not enough in the Hologram look, the glow is switched off and the button says why.
- **No layout work per label.** Labels are measured once, not every frame.

**Nothing goes off screen.** The camera frames the robot from the corners of every part's box (with perspective), so long panels near the camera are not cropped at any open state. The label columns hold only as many labels as fit between the top and the bottom of the view; when there are more, the selected and pointed-at parts keep theirs, then the biggest parts.

## Docking stations

Each robot is shown hooked to its own station, as a separate **Docking station** group (Phantas: an upright arch-shaped dock, 345 x 195 x 689 mm; CC1 Pro: a low charging station, 390 x 390 x 165 mm). With the suit sealed the robot sits against it. Open the suit and the station comes apart on its own, to the right of the robot: shell, indicator window, charging contacts, power board, back cover, cable and base. Pick the **Docking station** chip in the Parts list to look at it alone. The race does not use the stations.

## Develop

```bash
npm install
npm run build      # writes dist/index.html and dist/catalogue.artifact.html
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
  data/          One file per robot: parts, geometry, explode vectors, specs, sources;
                 interruptions.js (alarm types and which parts they point at),
                 interruption-stats.js (generated, aggregates only)
  interruption-ui.js  The Interruptions dropdown, banner and card
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

Race mode has a test hook: open the page with `?racedebug` (for example `dist/index.html?racedebug=1`) and `window.__raceDbg` exposes the live race (`S.race`, `S.scene`, the renderer, the key reader and the line-following driver), so a script can step a whole lap without waiting for frames. In a script, `window.__catalogueNoAdapt = true` (set before the page loads) turns off the automatic graphics step-down, so slow software rendering does not change the picture mid-test.

To add a part, add an object to a robot's `parts` array with a `home` position, an `ex` explode offset, a `layer` (0 outermost to 3 innermost) and a `build(b)` function. To add a robot, create a data file like `data/phantas.js` and register it in `main.js`.
