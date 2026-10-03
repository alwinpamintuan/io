# IO — Technical Implementation Specification

**Companion document:** IO Product & Interaction Specification

## 1. Technical objective

Build IO as a static client-side application whose visual scene behaves like a coherent 3D environment while retaining the appearance of a monochrome vector/technical illustration.

The implementation should use 3D technology as a **spatial engine**, not as an aesthetic engine.

The renderer is responsible for:

- camera projection;
- world-space placement;
- object occlusion;
- focus transitions;
- controlled depth-of-field or depth treatment;
- hit testing;
- simple physical-looking object transforms.

The design system is responsible for:

- flat monochrome surfaces;
- heavy silhouettes;
- restrained internal edges;
- minimal or no realistic lighting;
- contact shadows;
- sparse DOM annotations.

## 2. Recommended stack

### Core

- **Vite** — build/dev server;
- **TypeScript** — application and device-adapter code;
- **Three.js** — scene graph, camera, renderer, raycasting, simple geometry, video textures, line geometry;
- **HTML/CSS** — top-level UI, IO mark, accessibility fallbacks, measurement annotations;
- **Web APIs** — keyboard, pointer, Gamepad, MediaDevices, Web Audio, requestAnimationFrame.

### Optional libraries

Use only when they remove meaningful implementation risk:

- **GSAP** or a small custom tween layer for camera/object timelines;
- **XState** only if scene/device state grows beyond a simple explicit state machine;
- **stats/dev instrumentation** in development only.

Avoid introducing a large UI framework unless component complexity later justifies it. The app is stateful, but its visible DOM UI is intentionally small.

## 3. Architectural principle

Use one persistent scene.

Do not implement device routes as separate render trees. Do not destroy and recreate the selected device between overview and focused mode.

Conceptual architecture:

```text
App
├── SceneController
│   ├── Renderer
│   ├── CameraRig
│   ├── WorldRoot
│   │   ├── MonitorDevice
│   │   ├── KeyboardDevice
│   │   ├── MouseDevice
│   │   ├── WebcamDevice
│   │   ├── ControllerDevice
│   │   └── AudioDevices
│   ├── InteractionManager
│   └── MotionController
├── DeviceInputManager
│   ├── KeyboardAdapter
│   ├── PointerAdapter
│   ├── GamepadAdapter
│   ├── CameraAdapter
│   └── AudioAdapter
├── OverlayManager
└── Router / StateStore
```

The world persists for the lifetime of the application.

## 4. Render strategy

### 4.1 Renderer

Use `WebGLRenderer` with antialiasing enabled. Keep the background a flat off-white.

Recommended initial settings:

```ts
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xf4f4f0, 1);
```

Cap pixel ratio in production. A high-density 4K screen should not force unnecessary fill-rate cost.

### 4.2 Color management

Use a consistent output color space and verify neutral grays against the design palette. Do not rely on lighting to create the face hierarchy; assign the intended neutral directly to the face/material group.

## 5. Camera model

The design calls for an overview that reads orthographic, followed by more visible perspective during focus.

Two viable implementations exist.

### Option A — narrow-FOV perspective camera throughout (recommended for first prototype)

Use a `PerspectiveCamera` with a very narrow field of view and large camera distance in overview. This approximates parallel projection while allowing a continuous transition to stronger perspective by changing FOV and distance.

Benefits:

- one camera type;
- no projection switch;
- straightforward interpolation;
- less risk of a visual discontinuity during focus.

Example conceptual ranges:

- overview FOV: 8–14°;
- focus FOV: 24–38°;
- dolly camera distance inversely with FOV to maintain framing.

### Option B — true orthographic overview plus perspective focus

Use an `OrthographicCamera` for overview and a `PerspectiveCamera` for focus. This gives exact technical projection but requires either a controlled handoff or a transition technique that prevents a visible projection jump.

Use this only if the narrow-FOV perspective approximation fails the design review.

### 5.1 Camera rig

Never animate the camera object ad hoc from multiple modules. Create a `CameraRig` with explicit parameters:

```ts
type CameraPose = {
  position: Vector3;
  target: Vector3;
  fov?: number;
  roll?: number;
};
```

Device modules provide named poses. The rig owns interpolation.

## 6. World coordinate system

Use a simple world convention and document it in code.

Recommended:

- `X`: left ↔ right across the desk;
- `Y`: front ↔ back on the desk;
- `Z`: vertical;
- desk plane: `Z = 0`.

Choose an arbitrary but consistent world unit. One unit may represent roughly 10 cm, or models may be authored in normalized device units and then scaled into the scene. Physical accuracy is less important than consistent relative scale.

Every resting object exposes a support transform that places its contact geometry at `Z = 0`.

## 7. Scene graph conventions

Each device should use a predictable hierarchy:

```text
DeviceRoot
├── VisualRoot
│   ├── ChassisMeshes
│   ├── InteractiveParts
│   ├── EdgeLines
│   └── ContactShadow
├── Anchors
│   ├── cameraFocus
│   ├── labelAnchor
│   └── effectAnchor(s)
└── HitTargets
```

`DeviceRoot` owns world placement. `VisualRoot` may animate relative to it during hover/focus without corrupting the canonical layout.

## 8. Modeling rules

### 8.1 Geometry budget

Use primitive or low-poly geometry. The scene should look intentionally simplified.

Typical objects can be built from:

- rounded boxes;
- extruded 2D profiles;
- cylinders;
- planes;
- simple lathed profiles;
- 10–50 meaningful surfaces rather than dense meshes.

High polygon counts do not improve the visual target.

### 8.2 Device mass

Every major object should have explicit thickness. Do not fake a keyboard’s side wall with a 2D drop shadow.

Required minimum surfaces:

- top/front-facing surface;
- side wall(s);
- underside/deep face where visible.

### 8.3 Progressive detail

Overview models may omit fine detail that appears only in focus. Use LOD-like visibility groups rather than replacing the entire device object.

Example:

```text
KeyboardDevice
├── overviewKeys      (simplified key blocks)
└── focusKeys         (full addressable key set)
```

Crossfade or swap detail groups only when the camera transition makes the change perceptually safe.

## 9. Materials

Prefer `MeshBasicMaterial` or custom unlit shader materials so the palette remains stable and lighting-independent.

Suggested material roles:

```ts
paper       = 0xf4f4f0
sideLight   = 0xdcdcd7
sideDeep    = 0xbabab5
ink         = 0x0a0a0a
secondary   = 0x777772
```

Avoid metallic/roughness realism in V1.

If subtle light response is desired later, use it only after the flat material version passes design review.

## 10. Edge and outline strategy

The outline system is central to the product.

Do not rely on a generic post-process outline as the only line solution. Screen-space outlines often produce inconsistent weights, noisy internal edges, or undesirable joins.

Recommended approach:

1. model clean low-poly solids;
2. author explicit line geometry for important construction edges;
3. add a separate silhouette treatment if needed;
4. maintain three semantic line classes: silhouette, construction, detail.

Possible implementation options:

- `LineSegments` with carefully authored edges;
- `Line2` / fat-line utilities for stable pixel widths;
- custom shader-based expanded lines if necessary;
- selective `EdgesGeometry` only for simple objects where generated edges match the art direction.

The line system should be tested at the final reference viewport early. A correct 3D model with poor line rendering will still look amateur.

## 11. Shadows

### 11.1 Contact shadows first

Do not begin with physically realistic scene lighting.

Implement simple contact shadows as one of:

- soft alpha planes under support regions;
- small projected shadow meshes;
- a lightweight contact-shadow render pass restricted to near-desk geometry.

The requirement is visual grounding, not photorealistic light transport.

### 11.2 Ambient shadow

Optionally add one very soft composition-level shadow for separation from the background.

Avoid large floating drop shadows attached individually to each object.

## 12. Depth of field

Treat DOF as an enhancement, not a prerequisite.

First prove focus using:

- contrast;
- scale;
- occlusion;
- depth movement;
- desaturation/neutral shifts if needed.

If blur materially improves focused states, use a restrained post-processing solution. Blur should be disabled or reduced on lower-performance devices and under reduced-motion/accessibility settings if it harms legibility.

## 13. Hit testing and pointer interaction

Use raycasting against simplified invisible hit meshes rather than exact visible geometry.

Each device exposes one overview hit target and may expose sub-targets in focus mode.

Conceptual flow:

```ts
pointermove -> normalized device coordinates -> raycaster
           -> nearest enabled HitTarget
           -> hover state

pointerdown -> active target -> device-specific action
```

Keep hit meshes generous. The visual object can remain precise while the interaction target is forgiving.

## 14. Application state machine

Use an explicit scene state rather than scattered booleans.

```ts
type SceneState =
  | { mode: 'overview' }
  | { mode: 'focus'; device: DeviceId; phase: 'entering' | 'active' | 'exiting' };
```

Device-specific state is separate:

```ts
type KeyboardState = {
  held: Set<string>;
  tested: Set<string>;
};
```

The scene state owns navigation. Device adapters own input data. Device visuals subscribe to both.

## 15. Transition orchestration

Use named timelines rather than arbitrary tweens.

Each focus transition should coordinate:

- camera pose;
- selected device transform;
- background device depth/contrast;
- detail visibility;
- contact shadow separation;
- overlay annotation entrance;
- input-adapter activation.

Recommended lifecycle:

```text
requestFocus(device)
  -> lock overview hover changes
  -> start camera/device timeline
  -> activate device input near the end of transition
  -> set phase = active
```

Exiting reverses the same semantic sequence.

Avoid literally reversing every numeric tween if that creates awkward motion; reverse the choreography, not necessarily the exact easing curve.

## 16. Routing

Use hash routing for the static deployment unless a stronger requirement appears.

```text
#keyboard
#mouse
#monitor
#camera
#controller
#audio
```

On load:

- parse the hash;
- initialize the complete scene;
- move directly into the corresponding focus pose after assets are ready;
- preserve a short enough transition that deep links do not feel broken.

Browser Back/Forward updates scene state.

## 17. Device adapter contract

All device integrations should follow a common lifecycle.

```ts
interface DeviceAdapter<TSnapshot> {
  supported(): boolean;
  enter(): Promise<void> | void;
  exit(): Promise<void> | void;
  snapshot(): TSnapshot;
  subscribe(listener: (value: TSnapshot) => void): () => void;
}
```

Adapters never manipulate Three.js objects directly. They publish data; the scene visual consumes it.

This separation keeps browser quirks out of rendering code.

## 18. Keyboard adapter

Listen to `keydown` and `keyup` only while keyboard focus is active, except for global navigation shortcuts that are explicitly safe.

Store by `KeyboardEvent.code` when present because it corresponds to physical key position rather than produced character. Preserve `key` for optional layout-aware display.

Track:

- pressed codes;
- first press timestamp;
- release timestamp;
- repeat flag / interval;
- unique tested codes.

Do not call `preventDefault()` globally. Suppress only browser behaviors that directly interfere with the keyboard tester and only while focused.

System-reserved shortcuts may never reach the page; they must remain untested rather than inferred.

## 19. Pointer / mouse adapter

Use Pointer Events as the primary abstraction.

Track:

- button transitions;
- `buttons` bitfield;
- pointer positions;
- wheel deltas;
- event timestamps;
- optional coalesced pointer samples.

For high-granularity movement where supported, use `PointerEvent.getCoalescedEvents()` and/or `pointerrawupdate`. These capabilities are not universal, so the adapter must feature-detect them.

### 19.1 Estimated input frequency

Compute event/sample frequency over a moving time window, for example 250–1000 ms.

Recommended algorithm:

```text
collect timestamps
remove samples older than window
intervals = adjacent timestamp differences
hz = 1000 / median(intervals)
```

Use median rather than a single interval to reduce jitter.

Label this internally and in accessibility copy as an **estimated browser-observed event rate**, not a hardware USB polling-rate setting.

### 19.2 Double-click diagnostic

Store the previous press time per button and expose `deltaMs` for the most recent pair. Do not automatically declare a mouse defective from one interval; IO is a measurement tool, not a diagnosis engine.

## 20. Monitor adapter

Monitor tests are mostly render modes rather than hardware access.

Implement the display surface as a dedicated render plane or offscreen canvas texture so patterns can update independently of the full 3D scene.

Modes:

- solid fields;
- gradient;
- grid/geometry;
- motion target;
- repaint timing.

### 20.1 Refresh estimate

Use `requestAnimationFrame()` timestamps over a rolling sample window while the page is visible.

Discard or reset samples after:

- tab visibility changes;
- long pauses;
- major frame drops during scene transition;
- device changes that make the measurement meaningless.

A robust estimate should use a distribution of frame intervals, not one interval.

Example:

```text
intervals = stable rAF deltas
refreshHz = 1000 / median(intervals)
frameMs   = median(intervals)
```

The result describes browser repaint cadence. It does not prove panel response time or firmware refresh configuration.

## 21. Webcam adapter

Request camera access only after explicit user action in camera focus.

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: false
});
```

Feed the stream to an HTMLVideoElement and use it as a Three.js `VideoTexture` if the video belongs inside the 3D lens/display geometry.

Read active values from `MediaStreamTrack.getSettings()` where available.

Potential fields:

- width;
- height;
- frameRate;
- aspectRatio;
- facingMode when useful.

Stop every track on exit unless keeping the camera alive is a deliberate product decision. The default should favor privacy and battery life.

## 22. Gamepad adapter

Use `gamepadconnected`, `gamepaddisconnected`, and `navigator.getGamepads()`.

Poll active controller values once per animation frame only while controller mode is focused.

Normalize the visual layer around the standard mapping when `gamepad.mapping === 'standard'`. For non-standard mappings, show generic indexed buttons/axes or a compatibility state rather than pretending the layout is known.

Track:

- button values and pressed state;
- axes;
- controller ID/index;
- mapping;
- timestamp where meaningful.

Haptics are feature-detected and optional because support varies by browser, platform, and controller.

## 23. Audio adapter

### Output

Generate test signals through the Web Audio API rather than shipping audio files where practical.

Potential signals:

- channel identification;
- sine tones at a small set of safe, moderate frequencies;
- broadband/noise test only if UX and safety review justify it.

Keep output levels conservative and require direct user interaction before sound begins.

### Input

Request microphone access only after explicit selection.

Use `AudioContext` + `MediaStreamAudioSourceNode` + `AnalyserNode` for waveform/frequency data.

Do not represent digital amplitude as calibrated dB SPL.

## 24. Optional WebHID enhancement

WebHID can expose deeper device-specific data for some hardware, but it is limited/experimental in browser support and requires explicit permission in secure contexts.

Therefore:

- core V1 must not depend on WebHID;
- WebHID lives behind capability detection;
- device-specific integrations are optional enhancement modules;
- the UI must still function normally when `navigator.hid` is unavailable.

## 25. Overlay architecture

Use DOM overlays for:

- IO/home mark;
- compact measurement annotations;
- accessibility text;
- permission/compatibility fallback messaging;
- debug tooling in development.

Anchor annotations to 3D points by projecting world coordinates into screen space each frame only when the annotation is visible.

Conceptual utility:

```ts
function projectToScreen(world: Vector3, camera: Camera, viewport: Size) {
  const p = world.clone().project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * viewport.width,
    y: (-p.y * 0.5 + 0.5) * viewport.height
  };
}
```

Avoid large DOM overlays covering the renderer.

## 26. Custom cursor

Implement cursor state in DOM/CSS rather than WebGL so it stays crisp and can fall back cleanly.

Requirements:

- disable custom cursor under coarse pointers/touch;
- respect reduced motion;
- never delay the actual pointer position with heavy smoothing;
- maintain native cursor fallback for unsupported/accessibility configurations.

## 27. Responsive behavior

Use the camera and world layout, not CSS scaling alone, to adapt the composition.

Define viewport bands:

- desktop-wide;
- desktop/laptop standard;
- narrow laptop/tablet landscape;
- unsupported or reduced mobile experience.

Each band may use a named overview camera pose and slightly different device world positions while preserving the same spatial relationships.

Avoid arbitrary per-pixel layout nudges.

## 28. Reduced motion

Read `prefers-reduced-motion` at startup and observe changes if practical.

Reduced-motion mode:

- shortens camera travel;
- disables idle parallax;
- removes overshoot;
- reduces or removes depth-of-field animation;
- uses approximately 100–200 ms state transitions;
- preserves the same scene state model and tester functionality.

## 29. Asset loading

Keep V1 asset count low.

Preferred assets:

- procedural geometry where easy;
- small glTF files only for device shapes that are cumbersome to build procedurally;
- no large textures except video/canvas-generated test surfaces;
- no baked photorealistic materials.

Preload all scene-critical assets before enabling interaction. The initial skeleton scene can render immediately if loading exceeds a visually noticeable threshold.

## 30. Performance budgets

Initial targets for a 1440×900 reference viewport:

- steady 60 fps on a normal integrated-GPU laptop;
- no long tasks over ~50 ms during interaction;
- device input response visible on the next practical rendered frame;
- renderer pixel ratio capped at 2;
- scene geometry kept intentionally small;
- post-processing passes minimized;
- inactive adapters fully stopped or throttled.

For high-refresh displays, do not assume 60 fps in animation math. All motion must be timestamp-based.

## 31. Render loop

Use one application render loop.

```ts
function frame(now: number) {
  const dt = clock.tick(now);

  inputManager.pollActiveAdapters(now);
  motionController.update(dt);
  sceneController.update(dt);
  overlayManager.updateVisibleAnchors();

  renderer.render(scene, cameraRig.camera);
  requestAnimationFrame(frame);
}
```

Do not create independent animation loops per device.

## 32. Visibility and lifecycle

Use the Page Visibility API to pause or reset measurements that become invalid in a background tab.

On hidden:

- pause expensive visual effects;
- reset refresh-rate sampling;
- optionally suspend AudioContext where appropriate;
- avoid accumulating pointer/sample timing windows.

On device exit:

- remove listeners;
- stop media tracks when appropriate;
- clear timers;
- release transient buffers;
- restore scene hit targets.

## 33. Accessibility implementation

The WebGL scene is not semantically accessible by itself.

Maintain a parallel semantic control layer for devices:

```html
<nav aria-label="Peripheral tests">
  <button aria-label="Test keyboard"></button>
  <button aria-label="Test mouse"></button>
  ...
</nav>
```

These controls can be visually hidden or geometrically integrated, but must remain focusable and correctly synchronized with the scene.

Focused tests should expose meaningful status through restrained `aria-live` regions without announcing high-frequency measurements every frame.

## 34. Error model

Normalize browser/API errors into product-level states.

Example:

```ts
type CapabilityError =
  | 'unsupported'
  | 'permission-denied'
  | 'device-unavailable'
  | 'device-disconnected'
  | 'secure-context-required'
  | 'unknown';
```

The visual layer chooses the graphical response; the semantic layer provides the explanation.

Do not leak raw browser exception strings into the visible product.

## 35. Privacy and data handling

Core IO should require no backend.

Default rules:

- no camera or microphone upload;
- no persistent key logging;
- no storage of input histories;
- no analytics event should contain raw key sequences or media data;
- local storage, if used, is limited to harmless UI preferences.

## 36. Testing strategy

### 36.1 Unit tests

Test pure utilities:

- timestamp-window frequency estimator;
- keyboard-code mapping;
- gamepad normalization;
- scene-state reducer;
- hash routing;
- capability detection.

### 36.2 Integration tests

Automate where browser APIs permit:

- overview → focus → overview state transitions;
- URL hash synchronization;
- keyboard visual mapping;
- pointer button state;
- reduced-motion branch;
- permission-denied UI states using mocks.

### 36.3 Visual regression

Capture deterministic scene states at fixed viewport sizes:

- overview 1440×900;
- keyboard focus;
- mouse focus;
- monitor focus;
- reduced-motion overview;
- narrow desktop overview.

Use image-diff thresholds to catch camera/projection or line-weight regressions.

This is particularly important because small camera changes can destroy the spatial coherence without breaking functional tests.

### 36.4 Manual device matrix

Maintain a lightweight matrix across:

- Chromium desktop;
- Firefox desktop;
- Safari desktop where applicable;
- Windows / macOS;
- representative mouse, keyboard, controller, camera, and microphone hardware.

The matrix should record observed behavior, not promise unsupported hardware telemetry.

## 37. Suggested folder structure

```text
src/
├── app/
│   ├── state.ts
│   ├── router.ts
│   └── capabilities.ts
├── scene/
│   ├── SceneController.ts
│   ├── CameraRig.ts
│   ├── MotionController.ts
│   ├── materials.ts
│   ├── lines.ts
│   └── devices/
│       ├── KeyboardDevice.ts
│       ├── MouseDevice.ts
│       ├── MonitorDevice.ts
│       ├── WebcamDevice.ts
│       ├── ControllerDevice.ts
│       └── AudioDevice.ts
├── input/
│   ├── KeyboardAdapter.ts
│   ├── PointerAdapter.ts
│   ├── GamepadAdapter.ts
│   ├── CameraAdapter.ts
│   └── AudioAdapter.ts
├── overlay/
│   ├── OverlayManager.ts
│   ├── Cursor.ts
│   └── annotations.ts
├── utils/
│   ├── timing.ts
│   ├── projection.ts
│   └── statistics.ts
└── main.ts
```

## 38. Prototype milestones

### Milestone 0 — renderer spike

Deliver one monitor, keyboard slab, and mouse primitive under the same camera. Validate projection and line rendering before building accurate models.

Exit criteria:

- coherent shared projection;
- stable line weights;
- acceptable antialiasing;
- contact shadows look grounded.

### Milestone 1 — spatial overview

Build the full static workstation with low-detail models.

Exit criteria:

- final composition direction approved;
- occlusion relationships approved;
- no object reads as a floating asset.

### Milestone 2 — camera focus system

Implement overview ↔ keyboard, mouse, and monitor transitions only.

Exit criteria:

- one persistent object through transition;
- no visible projection jump;
- return pose is exact and deterministic.

### Milestone 3 — input proof

Wire keyboard and pointer data.

Exit criteria:

- immediate visual input response;
- no global listener leakage;
- statistics separated from render frequency.

### Milestone 4 — remaining devices

Add camera, controller, and audio.

### Milestone 5 — polish and compatibility

Tune DOF, reduced motion, browser fallbacks, error states, visual regression tests, and performance budgets.

## 39. Key technical risks

- **Outline rendering looks inconsistent** — Consequence: the scene feels amateur despite good geometry. Mitigation: prototype the line system before detailed modeling.
- **Camera transition reveals projection mismatch** — Consequence: “fake depth” returns. Mitigation: one CameraRig, narrow-FOV perspective first, and visual-regression captures.
- **Overuse of realistic lighting** — Consequence: the product becomes a generic 3D viewer. Mitigation: unlit materials and authored face tones by default.
- **DOM/3D overlays drift** — Consequence: measurements feel detached from objects. Mitigation: project named world anchors every visible frame.
- **Browser APIs imply false precision** — Consequence: misleading diagnostics. Mitigation: direct/derived/unsupported confidence model.
- **Post-processing hurts integrated GPUs** — Consequence: stutter undermines the premium feel. Mitigation: optional DOF, capped DPR, minimal passes.
- **Gamepad/controller layouts vary** — Consequence: incorrect visual mapping. Mitigation: prefer the standard mapping and provide a generic fallback.
- **Permission prompts feel intrusive** — Consequence: UX friction. Mitigation: request access only after explicit device focus.
- **Mobile constraints distort desktop composition** — Consequence: compromised primary experience. Mitigation: desktop-first scope and a deliberate reduced mobile experience.

## 40. Definition of done for the spatial prototype

The technical prototype is ready for detailed motion storyboarding when all of the following are true:

- monitor, keyboard, mouse, controller, speakers, and webcam share one world and one camera system;
- all resting objects are grounded on the common desk plane;
- the scene remains convincing with contact shadows disabled;
- line hierarchy is stable across the target viewport range;
- overview ↔ keyboard/mouse/monitor transitions use the same persistent objects;
- the camera can move from diagrammatic to more perspectival without a visible discontinuity;
- focus returns exactly to the overview pose;
- representative input can drive at least keyboard and mouse visuals;
- the renderer holds the agreed performance budget on integrated graphics.

Only after this gate should detailed easing, morph choreography, and per-device motion storyboards be treated as production work.

## 41. Browser API reference notes

The implementation assumptions in this document are based on current browser API behavior and should be feature-detected at runtime.

Useful references:

- MDN — `KeyboardEvent.code`: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
- MDN — `PointerEvent.getCoalescedEvents()`: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents
- MDN — `requestAnimationFrame()`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN — `MediaStreamTrack.getSettings()`: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getSettings
- MDN — Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
- MDN — Gamepad `vibrationActuator`: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/vibrationActuator
- MDN — `AnalyserNode`: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- MDN — WebHID API: https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API

As of this specification, WebHID and several higher-granularity pointer/haptics features require capability detection and should not be foundations of the V1 experience.
