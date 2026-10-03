# IO — Spatial Construction Sheet

**Companion documents:** IO Product & Interaction Specification; IO Technical Implementation Specification

This document turns the visual direction into a concrete scene layout. It is the source of truth for world scale, object origins, baseline dimensions, overview placement, camera framing, occlusion, support/contact relationships, and focus anchors.

The numbers below are construction values, not claims about real hardware dimensions. They are intentionally close to familiar physical sizes so that the scene remains intuitive to model and tune.

---

## 1. Construction rules

### 1.1 Hard constraints

The following rules are not tuning suggestions:

- all devices exist in one shared 3D scene;
- all resting desk devices reference the same invisible desk plane;
- one camera rig owns all projection and focus movement;
- device transforms are authored in world space, never positioned after projection;
- the object shown in overview is the same scene object used in focus mode;
- occlusion must remain physically consistent;
- object thickness is real geometry, not a 2D shadow substitute;
- line and material hierarchy remain graphic and unlit even though geometry is three-dimensional.

### 1.2 Tunable baseline values

Exact object positions, dimensions, and camera coordinates below are the baseline composition. They may be tuned during visual review, but changes should preserve the relationships specified in this sheet. Avoid isolated per-object nudges that destroy the shared projection.

---

## 2. World coordinate system

Use centimeters as world units:

```text
1 world unit = 1 cm
```

Axes:

```text
                 +Z
                  │
                  │  up
                  │
                  └──────── +X
                 ╱          right
                ╱
              +Y
              rear / away from viewer
```

Conventions:

- `+X`: viewer's right across the desk;
- `-X`: viewer's left;
- `+Y`: toward the rear of the workstation;
- `-Y`: toward the viewer;
- `+Z`: upward;
- desk plane: `Z = 0`.

The overview camera therefore sits primarily in negative `Y`, above the desk, with a modest positive `X` offset.

---

## 3. Reference viewport and composition frame

Primary review viewport:

```text
1440 × 900 CSS px
aspect ratio = 1.6
```

Minimum desktop review viewport:

```text
1280 × 720 CSS px
```

At 1440 × 900, reserve only minimal fixed UI margins:

- IO mark: top-left, 28–36 px from both edges;
- no persistent right-side label;
- no persistent footer copy;
- no device labels in overview.

The workstation should occupy approximately:

- 66–74% of viewport width;
- 62–70% of viewport height;
- visual center approximately 2–4% below viewport center.

Do not center every object geometrically. Center the **visual mass of the workstation**.

---

## 4. Invisible desk plane

The desk surface is not rendered in the normal product view.

For development, a debug plane/grid may be enabled at `Z = 0`.

Every resting object must expose at least one support/contact region at `Z = 0`:

- keyboard: underside feet/chassis footprint;
- mouse: underside shell footprint;
- controller: two or more lower-shell contact patches;
- monitor: stand foot;
- left/right speakers: base footprints.

The webcam is not desk-supported. It is parented to the monitor assembly through its mount anchor.

A device may lift away from `Z = 0` during hover or focus, but its rest transform must return exactly to its canonical support pose.

---

## 5. Model-origin conventions

Each model uses a predictable local origin.

### Desk-supported devices

For keyboard, mouse, controller, speakers:

```text
local origin = center of primary support footprint at desk height
local Z = 0   = desk contact level
```

This lets the scene place a device with:

```ts
device.position.z = 0
```

without model-specific compensation.

### Monitor

```text
local origin = center of monitor stand foot at desk height
```

The panel, neck, and stand are children of this origin.

### Webcam

```text
local origin = center of monitor/webcam mounting interface
```

The webcam is parented to a `webcamMount` anchor on the monitor rather than positioned directly in global space.

---

## 6. Baseline object dimensions

Dimensions are width × depth × height unless otherwise stated.

| Object | Baseline dimensions | Notes |
|---|---:|---|
| Monitor panel | 61 × 4.0 × 35 | 27-inch-class visual proportion; deliberately simplified |
| Monitor stand foot | 23 × 14 × 1.6 | low, broad, geometric |
| Monitor neck | 5 × 5 × 22 | visually centered, slightly tapered allowed |
| Keyboard | 44 × 14.5 × 2.8 | full-size-ish silhouette; can simplify numpad grouping |
| Mouse | 7.2 × 12.0 × 4.2 | deliberately chunky, clear button masses |
| Controller | 16.5 × 11.0 × 5.5 | familiar dual-stick silhouette, not brand-specific |
| Speaker cabinet | 8.5 × 8.5 × 18.5 | compact desktop speakers |
| Webcam body | 9.0 × 3.6 × 4.2 | mounted, lens centered or subtly offset |
| Webcam lens outer diameter | 3.2 | lens should read clearly in overview |
| Optional microphone | 5.0 × 5.0 × 13.0 | omit from overview if composition becomes crowded |

### 6.1 Exaggeration rule

Physical realism is subordinate to silhouette clarity. It is acceptable to exaggerate:

- chassis thickness by 10–25%;
- mouse button separations;
- controller trigger depth;
- webcam lens diameter;
- speaker driver diameter;
- keyboard key gap and keycap height.

Do not exaggerate relative scale enough to make the workstation feel toy-like.

---

## 7. Baseline overview layout

The canonical overview starts from the following world transforms.

Rotation values are Euler yaw around `Z` unless otherwise noted.

| Object | Position `(X, Y, Z)` cm | Rest yaw | Composition role |
|---|---:|---:|---|
| Monitor root | `(-3, 26, 0)` | `0°` | rear anchor / dominant mass |
| Left speaker | `(-39, 24, 0)` | `+1°` | rear-left framing object |
| Right speaker | `(33, 25, 0)` | `-2°` | rear-right; partially occluded by monitor |
| Keyboard | `(0, -14, 0)` | `-4°` | foreground dominant object |
| Mouse | `(31, -13, 0)` | `+4°` | foreground-right counterweight |
| Controller | `(-29, -20, 0)` | `-17°` | foreground-left diagonal tension |

The monitor is intentionally a little left of center. The keyboard crosses the visual center. The mouse and controller do not mirror each other.

### 7.1 Webcam mount

Add a `webcamMount` anchor to the monitor panel with an initial local position approximately:

```text
X = +7 cm
Y = -2.1 cm from panel center/front reference
Z = panel top + 1.3 cm
```

The webcam should sit slightly off the monitor's horizontal center. Exact offset depends on the final monitor silhouette.

### 7.2 Monitor panel height

The monitor panel should place its lower bezel approximately 24–27 cm above the desk and its top edge approximately 59–62 cm above the desk.

The stand geometry must physically account for this elevation. Do not place the panel independently of the stand.

---

## 8. Overview projection and camera

### 8.1 Baseline camera

Use a narrow-FOV perspective camera first. It approximates an orthographic technical drawing while retaining a continuous path into device focus.

Baseline pose:

```ts
position = (110, -440, 220)
target   = (  0,    5,  20)
fov      = 11°
near     = 1
far      = 2000
```

This places the camera approximately:

- 14° off frontal center in azimuth;
- 24° above the horizontal plane;
- far enough away that convergence is subtle.

The exact camera distance may be altered with FOV so long as framing and projection remain equivalent.

### 8.2 Overview camera acceptance test

At rest:

- keyboard left/right edges appear nearly parallel;
- monitor horizontal edges appear nearly parallel;
- speaker verticals remain visually vertical;
- no device appears to use a different perspective family;
- the scene reads as a technical drawing before it reads as a rendered 3D scene.

If visible convergence is distracting, reduce FOV and increase distance proportionally.

### 8.3 True orthographic fallback

If narrow-FOV perspective cannot achieve the required still-frame quality, use a true orthographic camera for overview and a controlled projection handoff during focus.

Do not switch to true orthographic until the narrow-FOV prototype has been visually evaluated at the reference viewport.

---

## 9. Occlusion plan

Occlusion is part of the composition, not a side effect.

The overview should include these intended overlaps:

1. **Keyboard over monitor stand** — the keyboard's rear/top region visibly crosses in front of at least part of the stand foot or neck projection.
2. **Controller under keyboard** — the controller's inner/right lobe or cable/edge disappears beneath the keyboard silhouette.
3. **Right speaker behind monitor** — roughly 10–30% of the speaker silhouette may be occluded by the panel depending on camera tuning.
4. **Webcam attached to monitor** — mount overlap makes it unambiguously part of the monitor assembly.
5. **Mouse relationship** — mouse remains mostly separated for clarity, but its contact plane and camera projection must still match the keyboard.

Avoid creating overlaps at every edge. The scene needs negative space to remain legible.

### 9.1 Occlusion debug test

Temporarily render all objects with:

- flat white faces;
- black silhouettes only;
- no shadows;
- no internal detail.

The scene should still communicate front/back ordering.

---

## 10. Contact-shadow construction

Each desk-supported device receives a dedicated contact-shadow object parented to the device root but rendered at or just above the desk plane.

Suggested treatment:

| Object | Contact shadow footprint | Opacity target | Blur character |
|---|---|---:|---|
| Keyboard | thin custom footprint under rear/front walls | 8–14% | very low |
| Mouse | compact oval/profile | 10–16% | low |
| Controller | two/few irregular patches | 8–14% | low |
| Monitor stand | stand-foot footprint | 10–16% | low |
| Speakers | narrow rectangles/ovals | 8–12% | minimal |

Avoid a large soft shadow halo around each device.

### 10.1 Shadow separation during lift

When a device lifts on hover/focus:

- keep shadow attached to the desk plane;
- slightly increase shadow softness and reduce opacity;
- do not move the shadow upward with the object.

This is one of the clearest cues that the device has physically separated from the desk.

---

## 11. Face/material assignment

Use geometry/material groups rather than lighting to establish form.

### 11.1 Material roles

```text
PAPER      #F4F4F0
SIDE_LIGHT #DCDCD7
SIDE_DEEP  #BABAB5
INK        #0A0A0A
SECONDARY  #777772
```

### 11.2 Directional convention

At the overview camera pose:

- upward-facing and camera-facing primary planes use `PAPER`;
- visible right/rear side planes generally use `SIDE_LIGHT`;
- undersides, deep recesses, port interiors, and strongly occluded faces use `SIDE_DEEP`;
- outlines and high-contrast input states use `INK`.

Do not algorithmically darken every face according to a simulated light. The palette assignment is art-directed and stable.

### 11.3 Selected-state inversion

Interactive parts may invert to `INK` with `PAPER` internal marks during active input. Avoid inverting the entire device merely because it is selected.

---

## 12. Line hierarchy

The intended viewport-space line weights are:

```text
silhouette   3.0–3.5 px
construction 1.5–2.0 px
detail       0.75–1.0 px
```

Line thickness should remain approximately screen-stable as the camera moves.

### 12.1 Silhouette lines

Use on:

- external device body boundaries;
- major negative-space holes that define silhouette;
- monitor panel outer boundary;
- controller body perimeter;
- mouse shell perimeter.

### 12.2 Construction lines

Use on:

- monitor bezel inner boundary;
- keyboard chassis/face separation;
- mouse button divisions;
- speaker driver rings;
- controller stick gates;
- webcam housing/lens boundaries.

### 12.3 Detail lines

Use sparingly on:

- key separations at focus scale;
- small ports;
- wheel tread;
- subtle speaker/webcam vents;
- tiny device details that are only useful close-up.

At overview distance, detail lines may be hidden.

---

## 13. Progressive-detail thresholds

Use distance/framing, not arbitrary page state, to reveal fine geometry.

Suggested visibility bands:

| Detail group | Overview | Mid-transition | Focus |
|---|---:|---:|---:|
| Major chassis surfaces | on | on | on |
| Silhouette lines | on | on | on |
| Construction lines | on | on | on |
| Individual keyboard key outlines | simplified | resolving | full |
| Key legends | off | mostly off | on if useful |
| Mouse wheel tread | off | optional | on |
| Controller glyph details | off | optional | on |
| Webcam micro-details | off | optional | on |
| Device metrics | off | enter late | on |

Do not visibly pop dense detail into existence while the object is stationary. Reveal it while motion/scale masks the transition.

---

## 14. Device geometry construction notes

### 14.1 Monitor

Use a thickened rounded panel, not a 2D rectangle.

Minimum geometry:

- outer chassis;
- inset display plane;
- side/rear depth;
- neck;
- foot;
- webcam mount anchor.

The panel should not be perfectly upright. A subtle 2–4° rear tilt around local `X` is acceptable.

The monitor remains the rear architectural anchor of the scene. Avoid overly decorative bezels.

### 14.2 Keyboard

Construct as a shallow wedge with a meaningful front wall and underside.

Recommended chassis characteristics:

- rear height slightly greater than front height;
- outer corner radius visually larger than keycap radius;
- keys sit above the top plate rather than being drawn onto it;
- overview key blocks can be grouped/simplified;
- focus keycaps are independent interactive objects or instanced meshes with per-key transforms.

Rest orientation should show enough front/side face to prove thickness.

### 14.3 Mouse

Use an asymmetric loft/extruded profile or low-poly rounded shell.

Minimum separations:

- shell/body;
- left/right button regions;
- wheel;
- optional side button group.

Avoid making the mouse look like a vertically extruded 2D icon.

### 14.4 Controller

The controller is the most organic object in the scene, but should still be simplified.

Prioritize:

- outer silhouette;
- grips with actual thickness;
- stick caps/gates;
- trigger depth;
- four-button cluster;
- D-pad.

Do not model brand-specific logos or exact commercial controller geometry.

### 14.5 Speakers

Use rectangular cabinets with clear front planes and side depth.

Drivers can be concentric low-poly cylinders/rings. Do not over-detail cones.

### 14.6 Webcam

The lens is the hero feature.

Use:

- simple horizontal body;
- mount/clamp;
- oversized readable lens rings;
- deep inner lens face.

The body should clearly attach to the monitor in overview.

---

## 15. Focus anchors and framing targets

Every device exposes a `cameraFocus` anchor and optional `effectAnchor` children.

Baseline focus targets below are starting points for the motion system.

| Device | Focus target in world space | Target viewport occupancy | Useful final view |
|---|---|---:|---|
| Keyboard | near `(0, -14, 3)` | 68–76% width | near top-down with visible chassis thickness |
| Mouse | near `(31, -13, 3)` | 34–44% width | three-quarter/top |
| Monitor | display center near `(-3, 26, 42)` | 90–100% viewport | front-on / entering screen |
| Webcam | lens center from mount anchor | 36–48% width before lens morph | frontal lens inspection |
| Controller | near `(-29, -20, 4)` | 46–58% width | top-three-quarter |
| Left/right audio | selected speaker driver center | 34–44% width | near frontal speaker face |

These occupancy values describe the selected object, not the full scene. Background context remains visible unless a test mode deliberately fills the viewport.

---

## 16. Baseline focus camera poses

These poses are initial construction targets. Motion interpolation and final framing are specified in the Motion Storyboard.

### 16.1 Keyboard

```ts
position = (18, -92, 95)
target   = ( 0, -14,  2.5)
fov      = 27°
```

Characteristics:

- camera becomes much more elevated;
- keyboard reads near top-down;
- front/side chassis remains visible;
- monitor persists in upper background.

### 16.2 Mouse

```ts
position = (62, -87, 63)
target   = (31, -13, 3)
fov      = 30°
```

Characteristics:

- moderate overhead view;
- wheel and primary buttons legible;
- keyboard remains as nearby contextual mass.

### 16.3 Monitor

```ts
position = (-1, -54, 49)
target   = (-3,  26, 42)
fov      = 30°
```

The camera path should align progressively with the display normal. Final test modes may move closer or treat the display plane as a full-viewport surface after the physical transition completes.

### 16.4 Webcam

```ts
position = (10, -36, 66)
target   = webcamLensWorldPosition
fov      = 31°
```

The final lens-to-preview transformation may transition from world rendering to a live video surface while preserving the webcam housing around it.

### 16.5 Controller

```ts
position = (-48, -83, 65)
target   = (-29, -20, 3.5)
fov      = 30°
```

### 16.6 Audio / speaker

```ts
position = (-50, -54, 41) // left speaker example
target   = leftSpeakerDriverWorldPosition
fov      = 30°
```

Mirror/reframe for the right speaker only if both speakers can be selected independently.

---

## 17. Device lift transforms

Hover and focus lift should occur relative to the canonical root, not by editing the permanent world position.

Recommended child hierarchy:

```text
DeviceRoot      // canonical world placement
└── VisualRoot  // hover/focus lift and local rotation
```

Baseline hover lift:

```text
Z +0.35 to +0.60 cm
```

Baseline focus separation before/while camera closes:

```text
keyboard   +1.5 to +2.5 cm
mouse      +1.5 to +2.5 cm
controller +2.0 to +3.5 cm
speaker    +0.8 to +1.5 cm
```

Monitor should mostly remain structurally planted. The webcam may articulate from its mount rather than translate freely.

The lift is intentionally small. The camera creates most of the perceived movement.

---

## 18. Background recession in focus mode

Do not scatter background devices into arbitrary positions. Keep their canonical roots stable.

Recession should come primarily from:

- camera parallax;
- depth of field or controlled blur;
- reduced internal detail;
- slightly reduced contrast;
- optional 1–3 cm local backward/downward settling only when composition demands it.

The selected object may move modestly. The room does not explode apart.

---

## 19. Safe negative-space regions

At overview, preserve usable negative space primarily:

- upper-left around the IO mark;
- upper-right beyond the webcam/monitor silhouette;
- lower-right beyond the mouse;
- small lower-center gaps between foreground objects.

Do not fill these regions with decorative labels.

In focus modes, metrics should preferentially occupy negative space generated by the camera rather than forcing the device aside.

---

## 20. Responsive construction

Do not simply scale the entire scene to fit every aspect ratio.

### 20.1 1440 × 900 reference

Use the baseline transforms directly.

### 20.2 1280 × 720

Allowed changes:

- camera pullback by approximately 5–10%;
- small target shift upward;
- controller and mouse may move inward by 1–3 cm;
- internal detail may simplify sooner.

Do not change device relative scale independently.

### 20.3 Very wide desktop

Keep the workstation within a controlled maximum composition width. Do not spread devices to fill empty screen space.

### 20.4 Narrow/mobile

Use a separate recomposition if supported. The desktop spatial sheet is not required to collapse into a mobile layout by camera zoom alone.

---

## 21. Development debug modes

Implement these development-only toggles early:

### `debugGrid`

Show desk plane axes and 5 cm grid.

### `debugBounds`

Show device world-space bounding boxes.

### `debugAnchors`

Show root, support, camera focus, effect, and hit-test anchors.

### `debugCamera`

Display camera position, target, FOV, and current device focus pose.

### `debugFlat`

Render every surface white with outlines only.

### `debugNoShadow`

Disable all contact and ambient shadows.

### `debugHitTargets`

Render raycast targets translucent.

These modes are required because visual inconsistencies are much easier to diagnose spatially than by tweaking CSS.

---

## 22. Spatial validation sequence

Review the scene in this order. Do not polish later stages before earlier ones pass.

### Stage A — silhouette

Render only major white solids and black silhouettes.

Pass when:

- every device is immediately recognizable;
- the composition feels intentional;
- front/back order is clear.

### Stage B — shared projection

Enable construction edges, still without shadows.

Pass when:

- every device appears to share one camera;
- no object reads as a separately drawn icon;
- the desk plane can be inferred.

### Stage C — mass

Enable side/deep materials.

Pass when:

- objects feel thick enough without realistic lighting;
- side-face darkness is coherent across the scene.

### Stage D — grounding

Enable contact shadows.

Pass when:

- all desk objects feel supported rather than floating;
- shadows reinforce, rather than create, depth.

### Stage E — internal detail

Enable key divisions, drivers, wheel, controls, lens details.

Pass when:

- the scene remains calm at overview scale;
- internal detail does not compete with silhouettes.

### Stage F — interaction lift

Enable hover and focus separation.

Pass when:

- the selected device feels physical;
- no object loses its relationship to the desk/world.

---

## 23. Spatial acceptance criteria

The construction is ready for motion work when all of the following are true:

- the overview still reads correctly with every shadow disabled;
- the camera position can be stated unambiguously and explains every object's projection;
- keyboard, mouse, controller, speaker bases, and monitor foot all visibly agree on `Z = 0`;
- the webcam clearly belongs to the monitor assembly;
- at least three deliberate occlusion relationships are visible;
- the keyboard has real side/front mass rather than a flat face plus shadow;
- the mouse and controller do not look like extruded icons;
- line weights remain coherent at 1440 × 900 and 1280 × 720;
- the scene uses no persistent device labels to explain itself;
- the overview composition survives the `debugFlat` and `debugNoShadow` tests;
- every device exposes a stable root, support region, focus anchor, and hit target;
- changing camera FOV or target affects all objects coherently because none are post-projection positioned.

Once these conditions pass, use the Motion Storyboard as the source of truth for transition choreography.
