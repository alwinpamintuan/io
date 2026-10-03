# IO — Product & Interaction Specification

**Product:** Static, client-side peripheral testing utility  
**Working name:** IO

## 0. Spatial direction

The experience looks like a monochrome technical illustration while behaving as one coherent 3D world rendered in a deliberately flat, graphic style. The spatial system follows these rules:

- one shared camera and one shared world coordinate system for every device;
- an invisible desk plane that all resting hardware physically references;
- controlled orthographic/dimetric presentation in the overview, with perspective becoming more apparent during focus transitions;
- stronger object mass through explicit top, side, and underside faces rather than decorative shadows;
- contact shadows and occlusion as the primary depth cues;
- substantially less visible copy and fewer device labels;
- a hybrid implementation direction: a lightweight 3D spatial engine for projection, camera, occlusion, and transitions; HTML/SVG only where it is the better interaction surface;
- the current prototype is treated as a composition reference, not as a geometry reference.

## 1. Product definition

IO is a peripheral testing environment presented as one interactive workstation.

There is no conventional landing page, hero section, feature grid, device card list, onboarding flow, or marketing narrative. The user opens IO and immediately sees a stylized workstation containing the devices that can be tested.

The illustration is the navigation. The selected object becomes the tester. Motion communicates hierarchy, state, and movement through the environment.

### Core thesis

**The scene is the interface.**

The product should feel like a functional technical poster that becomes dimensional when touched.

## 2. Product principles

### 2.1 One world, not a collection of drawings

Every object must inhabit one mathematically coherent scene. If the camera, desk plane, object scale, or light direction changes, the effect must be consistent across the entire workstation.

A device is never positioned “by eye” after projection. Devices are positioned in world space and then projected by the same camera.

### 2.2 Object first

A keyboard should visually become the keyboard tester. A mouse should visually become the mouse tester. Avoid the common pattern of placing a decorative device illustration beside a generic dashboard.

### 2.3 Motion is navigation

Selecting a device changes camera position, camera target, scale, depth, orientation, focus, and object state. It does not feel like navigating to another page.

### 2.4 Stillness is premium

The overview should be nearly static. The scene earns motion through interaction. Constant idle animation is avoided.

### 2.5 Data is subordinate

Measurements are attached to the object like annotations on an engineering drawing. They do not become cards, sidebars, dashboards, or panels unless an accessibility fallback requires it.

### 2.6 Browser measurements must remain honest

IO reports what the browser can actually observe. Direct events may be shown directly. Derived values are treated as estimates. Unsupported hardware properties are hidden rather than invented.

## 3. Experience model

There are two primary visual navigation states:

1. **Overview** — one complete workstation, all supported devices visible.
2. **Device focus** — one device moves into a useful testing orientation while the original workstation remains spatially present.

Focused devices may expose internal test modes, but those modes should feel like the object changing state rather than the user navigating deeper into an application.

Suggested URL state:

```text
/
#keyboard
#mouse
#monitor
#camera
#controller
#audio
```

Browser Back should restore the previous scene state.

## 4. Overview composition

The overview is a single workstation composition with a clear foreground, middle ground, and rear band.

### Rear band

- monitor;
- speakers;
- webcam mounted to the monitor.

### Middle band

- monitor stand;
- portions of controller or cabling that cross behind foreground objects.

### Foreground band

- keyboard;
- mouse;
- controller front geometry.

The keyboard should slightly occlude the monitor stand. The controller should tuck partly behind or beneath the keyboard on the left. The mouse remains separated on the right but should still share the same desk plane and contact-shadow logic. At least one speaker may be partially occluded by the monitor to strengthen spatial coherence.

The scene should be intentionally asymmetric. It should feel composed, not arranged like an ecommerce product lineup.

## 5. Camera and projection

### 5.1 Overview camera

The overview must read as a soft orthographic/dimetric technical drawing.

Target visual characteristics:

- elevation approximately 22–26 degrees;
- azimuth approximately 10–18 degrees off center;
- minimal convergence of parallel lines;
- monitor, keyboard, and desk-aligned objects clearly sharing one projection.

Implementation may use either a true orthographic camera or a very narrow-field perspective camera if continuous projection morphing is required. The acceptance criterion is visual: the resting scene should read diagrammatically, not cinematically.

### 5.2 Focus camera

Perspective becomes more visible during device focus. The user should feel the diagram “open up” into space.

The transition can alter:

- camera distance;
- focal length / field of view;
- camera target;
- object local rotation;
- object scale within the frame;
- depth-of-field intensity.

The selected device remains the same scene object throughout the transition.

## 6. Invisible desk plane

All resting desktop hardware references one invisible plane, conceptually `Z = 0`.

This includes:

- keyboard chassis;
- mouse underside;
- controller contact points;
- monitor foot;
- speaker bases.

The desk surface does not need to be drawn. Its existence is proven by consistent contact shadows, common vertical axes, believable occlusion, and consistent object elevation.

No object may appear to float unless it is intentionally animating away from the plane.

## 7. Visual language

The visual direction is **monochrome industrial neo-brutalism with premium technical-drawing restraint**.

Useful references as a design category include industrial design sketches, axonometric diagrams, monochrome editorial illustration, technical manuals, museum-model photography, and minimal product configurators.

The scene should look less “illustrated” and more “constructed.”

### 7.1 Palette

Permanent interface:

- Paper: `#F4F4F0`
- Ink: `#0A0A0A`
- Secondary ink: `#777772`
- Light side face: `#DCDCD7`
- Deep face / underside: `#BABAB5`

Color is permitted only when the test itself requires it, such as monitor RGB fields.

### 7.2 Surface hierarchy

Objects gain mass through explicit surfaces rather than realistic lighting:

- top/front-facing surfaces: paper/off-white;
- side faces: slightly darker neutral;
- undersides/deep recesses: darker neutral;
- outlines: near-black.

The geometry should explain volume even if every dynamic shadow is disabled.

### 7.3 Line hierarchy

At the reference desktop viewport:

- external silhouette: approximately 3–3.5 px equivalent;
- major construction edge: approximately 1.5–2 px;
- internal detail: approximately 0.75–1 px.

External silhouettes carry the neo-brutalist character. Fine internal edges provide refinement.

### 7.4 Detail discipline

Silhouettes and object relationships are more important than small details.

At overview scale, keyboards do not need every key to be equally articulated. Devices may gain visual resolution as the camera approaches them. Detail can progressively appear during focus.

## 8. Shadows and depth

### 8.1 Contact shadows

Replace generic blurred drop shadows with compressed contact shadows at real support points.

Examples:

- thin keyboard shadow directly beneath its front and side walls;
- small mouse contact region under the shell;
- defined shadow under monitor foot;
- speaker base shadows directly below each cabinet.

A very soft ambient composition shadow is permitted, but it must not be the primary depth cue.

### 8.2 Occlusion

Occlusion is mandatory. The scene should not consist of politely separated assets.

At least several object relationships in the overview should visibly cross in depth. The viewer should be able to infer front/back ordering even with shadows removed.

### 8.3 Depth of field

Depth of field is primarily a focused-state effect, not an overview decoration.

Typical focused treatment:

- selected device: sharp, full contrast;
- nearby scene: mild blur, 65–80% effective contrast;
- distant scene: stronger blur, 40–60% effective contrast.

The workstation must remain recognizable.

## 9. Brand and visible copy

The overview should contain almost no prose.

Retain only a tiny IO mark in a corner, preferably geometrically constructed as a line and ring. The mark can double as the overview/home control.

Remove persistent device names, numbered labels, “all devices,” explanatory footer text, marketing copy, and large IO branding inside the monitor.

Device affordance comes from object response, cursor response, spatial lift, contrast, and motion.

## 10. Cursor and affordance

A custom cursor is allowed if it remains precise and unobtrusive.

Suggested behavior:

- small black ring at rest;
- filled state while pressing;
- subtle scale-up over interactive objects;
- very light magnetic attraction only when it does not compromise pointer precision.

On hover, a selectable device may:

- lift a few millimeters in world space;
- separate its contact shadow;
- increase silhouette emphasis slightly;
- rotate by a very small amount toward the camera.

No text tooltip is required.

## 11. Device-selection transition

Selecting a device is a camera-and-object move, not a fade between duplicated assets.

Canonical sequence:

1. Pointer or key activation produces immediate physical response.
2. The selected object separates slightly from the desk plane.
3. Camera target moves toward the object.
4. Camera framing tightens.
5. Perspective becomes more apparent.
6. The object rotates into its useful testing orientation.
7. Background devices remain visible and recede in focus/contrast.
8. Device-specific interaction activates.

Target duration: **500–700 ms**.

The selected object must remain visually continuous throughout.

## 12. Device specifications

### 12.1 Keyboard

The keyboard moves toward center and rotates toward near top-down inspection while preserving enough chassis thickness to retain physicality.

Each visible key is independently addressable. On `keydown`, the matching key depresses and inverts. On `keyup`, it returns. Multiple simultaneous keys remain depressed together.

Primary information:

- keys currently held;
- unique keys detected;
- key hold duration;
- repeat interval when useful.

Physical-position mapping should prefer `KeyboardEvent.code` where available, with layout-aware fallbacks. Browser/system shortcuts that never reach the page must not be reported as successful inputs.

### 12.2 Mouse

The mouse lifts and rotates toward a clear three-quarter/top inspection view. The desk region around it becomes the movement surface.

Inputs:

- left button;
- right button;
- middle button;
- additional buttons when exposed;
- wheel movement;
- pointer movement.

Visuals:

- physical button compression;
- illustrated wheel rotation;
- short-lived movement trail;
- optional slight lean toward movement vector.

Metrics:

- time between recent clicks;
- estimated browser-observed input/event frequency;
- wheel delta and direction.

IO must not label browser event frequency as the mouse’s configured USB polling rate.

### 12.3 Monitor

The camera moves into the display rather than moving the display toward the user. The bezel grows until the panel nearly fills the viewport.

Test modes:

- black / white / neutral gray;
- red / green / blue;
- gradient;
- geometry/grid;
- motion pattern;
- repaint timing / estimated refresh frequency.

Refresh-rate reporting is an estimate derived from browser repaint timing. It is not direct monitor firmware telemetry.

### 12.4 Webcam

The webcam is mounted on the monitor in overview. On selection, the camera approaches the webcam and the lens expands into the live preview area while part of the housing remains visible.

Camera permission is requested only after explicit webcam selection.

Displayable track values include current width, height, frame rate, and aspect ratio when exposed by the active media track.

### 12.5 Game controller

The controller moves forward and rotates toward a useful inspection angle.

Digital buttons fill/invert when pressed. Analog sticks move within visible gates. Triggers track analog depth. D-pad directions depress independently.

Useful metrics:

- axis values;
- stick magnitude;
- center drift;
- trigger value;
- button count;
- axis count.

Haptics are optional enhancement only because platform/controller/browser support varies.

### 12.6 Audio

Audio is represented through speakers and, if included in the scene, a compact microphone object.

Speaker focus supports channel and tone tests. Visual sound waves originate from the speaker cone and synchronize with generated output.

Microphone focus supports a live waveform and optional frequency visualization. Amplitude values are digital signal amplitude unless a calibrated measurement path exists; they must not be presented as real-world SPL.

## 13. Statistical UI language

Avoid cards and dashboards.

Measurements should resemble technical annotations attached to the object or unused negative space:

```text
144 Hz ─────────
```

```text
      8.1
      ms
──────●
```

Prefer compact values over explanatory labels:

- `144 Hz`, not “Refresh Rate: 144 Hz”;
- `8.2 ms`, not “Time Between Clicks: 8.2 milliseconds.”

Use tabular numerals for changing values.

## 14. Motion language

There are two motion classes.

### Camera / environment motion

- controlled;
- heavy;
- low overshoot;
- 450–700 ms typical duration.

### Object / control motion

- immediate;
- slightly playful;
- 70–180 ms typical duration;
- spring behavior permitted where it improves physicality.

The contrast is deliberate: **the environment is controlled; the hardware is playful.**

Morphing is used only where two states have a clear conceptual relationship, such as webcam lens to live viewport or speaker cone to waveform.

## 15. Navigation and exit behavior

The IO mark can act as the persistent overview control. Browser Back should also reverse scene focus.

Clicking a sufficiently empty background region may return to overview when doing so does not conflict with a device test.

Do not reserve Escape as the universal exit action because keyboard testing must be able to inspect Escape itself.

## 16. Permissions and error language

Permissions are contextual and delayed until needed.

- Webcam selection may request camera access.
- Microphone selection may request microphone access.
- Optional advanced HID behavior may request HID permission only from the relevant enhancement path.

Denied or unavailable states should first be expressed graphically: closed aperture, disconnected cable, collapsed waveform, disabled actuator, or retracting measurement. Accessible text must still communicate the actual error.

## 17. Browser measurement confidence

Internally classify measurements as:

- **Direct** — Browser reports the observed event or state directly. Examples: key events, mouse buttons, gamepad axes, active camera track settings.
- **Derived** — IO estimates a value from observed timing/data. Examples: display repaint frequency and pointer event frequency.
- **Unsupported** — The browser does not provide trustworthy access. Examples: true USB polling configuration, physical display response time, calibrated microphone SPL.

Do not display fake precision. Round estimates to a precision justified by the observation window.

## 18. Accessibility

The interface may be visually wordless while remaining semantically explicit.

Requirements:

- accessible names for every selectable device;
- complete keyboard navigation;
- visible focus indicators compatible with the graphic language;
- reduced-motion behavior using `prefers-reduced-motion`;
- accessible text for permission failures and unsupported features;
- no information conveyed only by blur, motion, or subtle shade differences.

Reduced-motion mode should shorten/reduce camera travel rather than replacing the interaction model.

## 19. Responsive strategy

Desktop is the primary design target because the product tests desktop peripherals.

Reference design viewport: approximately **1440 × 900**.

Primary supported desktop range begins around **1280 × 720**.

Narrow layouts may recompose object placement, reduce camera movement, increase hit targets, and hide irrelevant tests. Mobile feature parity is not a requirement.

## 20. Performance quality bar

Target stable native-refresh animation on a typical modern laptop with integrated graphics.

Rules:

- only the active device receives high-frequency updates;
- statistics are throttled independently from animation;
- large blur/post-processing effects are conservative;
- geometry remains intentionally simple;
- idle scene does not continuously animate;
- transitions favor transforms over DOM reflow;
- movement histories and trails have hard caps.

## 21. V1 scope

Core devices:

1. keyboard;
2. mouse;
3. monitor;
4. webcam;
5. game controller;
6. speaker / microphone.

Do not expand V1 into specialty HID categories until the scene, camera transitions, and core tester interactions meet the visual quality bar.

## 22. Explicit non-goals

IO is not:

- a synthetic benchmark;
- a driver utility;
- a system-information dashboard;
- a PC-building site;
- a hardware-review site;
- a score generator;
- an account-based application;
- a marketing homepage.

It is a visual diagnostic surface for immediate human interaction with attached peripherals.

## 23. Prototype sequence

### Prototype A — Spatial proof

Build monitor, keyboard, mouse, and enough desk-relative geometry to prove:

- one coherent projection;
- shared world coordinates;
- occlusion;
- contact shadows;
- camera focus transitions;
- line and surface hierarchy.

No diagnostic logic is required yet.

### Prototype B — Input proof

Add keyboard and mouse input mapping. Prove that physical input feels connected to the rendered object.

### Prototype C — Scene completeness

Add controller, webcam, speakers/audio, and refined composition.

### Prototype D — Diagnostics

Add measurements, monitor test modes, camera data, audio analysis, and optional enhancements.

## 24. Acceptance criteria

The overview is accepted only if:

- removing shadows still leaves a coherent three-dimensional workstation through silhouette and occlusion alone;
- monitor, keyboard, speakers, mouse, webcam, and controller clearly share one camera;
- every resting device convincingly references the same invisible desk plane;
- no object looks like an independently placed SVG asset;
- the IO mark is the only persistent brand/UI element required to understand the scene;
- the user can discover device interactivity through object response without reading instructions.

The focused interaction system is accepted only if:

- the selected object is visually continuous from overview to test state;
- useful interaction begins within roughly 700 ms;
- the original workstation remains spatially legible;
- physical input produces immediate visual response;
- returning to overview restores the composition exactly;
- measurements remain secondary to the device.

## 25. Design thesis

IO should feel as though a workstation was built from white museum board, its edges drawn with a technical pen, photographed through a nearly orthographic camera, and then given physical behavior.

The signature tension remains:

- flat ↔ dimensional;
- brutal ↔ refined;
- playful ↔ precise.

The 3D system exists to make the illustration physically coherent. It must never become the visual style itself.
