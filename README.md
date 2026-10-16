# Armory

A 3D teardown of two commercial cleaning robots: the **Gausium Phantas** and the **PUDU CC1 Pro**. Pinch or scroll and the robot opens up in waves (shell first, then tanks and sensors, then the deep internals) so you can look at every part, including the water tanks.

Two looks, switched in the top-left panel:

- **Studio** (default): a photographed-product look. Lacquered white shell, smoked glass, rubber, steel, soft shadows on a light floor, a contact shadow that fades as the robot lifts apart, and weighty spring motion. The floor follows the lowest part, so the sealed robot rests on it and open parts float above it.
- **Hologram**: the dark HUD version with glowing outlines, a scan beam and bloom.

Open `dist/index.html` in a browser. It is a single self-contained file (Three.js is bundled in). It needs WebGL; the fonts load from Google Fonts when online and fall back to system fonts offline.

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
  body.html, style.css
```

To add a part, add an object to a robot's `parts` array with a `home` position, an `ex` explode offset, a `layer` (0 outermost to 3 innermost) and a `build(b)` function. To add a robot, create a data file like `data/phantas.js` and register it in `main.js`.
