# IO engineering and design principles

IO is a static, client-side space for testing devices. The illustrated workstation is the interface: select a device, test it in focus, and return through the distinct overview arrow. The IO mark and small current-view label provide orientation. Keep diagnostic information small, legible, and tied to the relevant device.

## Product and interaction

- Support keyboard, mouse, monitor, webcam, controller, audio output, and microphone as distinct testers.
- Keep overview calm. Focus reveals the selected device's controls and observations without replacing its scene object.
- Preserve hash deep links, browser Back/Forward, interruption during transitions, and an exact return to the resting workstation.
- Make selection and controls accessible through semantic HTML, visible focus, descriptive labels, and keyboard operation. Expose device navigation on narrow screens and in the WebGL fallback.
- Escape remains testable keyboard input. Use explicit home navigation; native fullscreen exit retains its browser behavior.
- Keyboard tested-key progress lasts for the page session, across focus changes, until Reset. Reserved browser or operating-system shortcuts cannot be guaranteed.
- Controller display legends are presentation preferences. Standard mapping determines physical controls; unknown mappings use indexed diagnostics without implying a standard layout.
- Monitor patterns are inspection tools. Keep their controls usable in fullscreen and preserve the test surface's aspect ratio.
- Show webcam video in an adjacent viewing frame, with contain-fit video and an explicit mirror preference. The camera remains mounted on the monitor.

## Visual design and space

Prioritize coherent projection, silhouette, occlusion, grounding, line hierarchy, motion continuity, then fine detail.

- Use a quiet, warm, mostly white workstation with restrained gray shading and functional dark surfaces. Smooth authored forms, readable silhouettes, and subtle seams carry the design.
- Keep the monitor as the anchor, speakers balanced around it, keyboard in front, controller to the left, and mouse to the right. Give the cluster breathing room while keeping devices visually connected.
- Use a short, visibly connected monitor support, grounded speakers and microphone, an integrated mouse shell, and readable controller controls.
- Let shading define volume. Outer contours are stronger than seams; construction marks and small details remain subordinate. Avoid dense blueprint grids, ornamental callouts, and photorealistic lighting.
- The monitor may show a sparse calibration motif at rest; inspection patterns replace it completely.
- All devices share one projection and world coordinate system. Units are centimeters: X right, Y rearward, Z up; the invisible desk is Z=0.
- Keep canonical device roots separate from focus transforms and diagnostic anchors. Parent the webcam to its monitor mount. Resting contact shadows stay on their supports when a device lifts.
- Anchor overlays and controller scopes to actual world geometry. Preserve clear silhouettes and avoid annotation overlap with controls.
- Use sparse, low-contrast drafting anchored to hardware geometry, with cropped grids and clear silhouettes. Keep names and leaders hidden at rest; hover or keyboard focus reveals one device label and its related field. Labels activate the same tester as the device and remain reachable by pointer. Hide overview annotations during focus and transitions. Avoid decorative props and ghost hardware.
- Optional device visibility is a presentation policy, separate from availability evidence. Keep core workstation objects and accessible testers; reframe reduced overviews modestly without moving canonical roots. Do not infer precise hardware presence from browser support or permission state.
- Keep exact dimensions, camera poses, and line widths in the source, rather than duplicating tuning constants in documents.

## Motion

- Move one shared camera continuously between overview and focus. Keep hover cues brief and restrained; avoid bounce, idle floating, and decorative motion.
- Interrupt transitions from the current pose, with explicit state and revision guards. Resizing must preserve continuity.
- Input feedback is immediate and restrained. Camera choreography must not delay testing or fabricate device activity.
- Reduced motion uses brief controlled transitions and static input feedback. Show focus diagnostics when placement is stable and restore exact resting transforms on return.

## Engineering

- Use one persistent Three.js scene, one shared world, one perspective camera, and one application render loop. Never recreate devices when entering focus.
- Device adapters publish plain snapshots and never manipulate Three.js objects. Scene presentation consumes those snapshots.
- Use explicit application state and transition revisions. Poll active devices through the shared clock; bound histories and reuse geometry buffers.
- Retain TypeScript, Three.js, and small semantic DOM controls. Avoid large UI frameworks, dashboard/card layouts, unnecessary dependencies, and backend services.
- Cap pixel ratio and skip idle redraws. Keep scene resources reusable and cleanup symmetric, including listeners, tracks, audio, pending requests, and context recovery.
- Feature-detect browser APIs and provide usable fallback controls when rendering or a device capability is unavailable.
- Keep authored mesh source and baked assets together; regenerate assets with `node scripts/author-devices.mjs` when control points change. Run `npm test`, `npm run typecheck`, and `npm run build` for application changes. Tests protect behavior and geometry invariants, not incidental screenshots or implementation details.

## Privacy and measurement honesty

- Camera and microphone access starts only from explicit Start controls. Selection alone must never request permission.
- Stop, leaving focus, backgrounding, and shutdown release media and audio. Canceled asynchronous requests cannot reactivate a device.
- Keep observations in page memory. No analytics, uploads, recordings, persistent diagnostic storage, or external runtime assets.
- Never present browser-derived measurements as direct hardware telemetry. Mouse event frequency is browser delivery; repaint cadence is browser timing; track settings are reported settings; microphone RMS is digital amplitude, not calibrated sound pressure.
- Keep microphone input separate from output testing and never feed it into speakers. Use conservative, short output tones and an explicit Stop control.

These principles describe the current product. Changes to them must be explicit; historical implementation briefs and review evidence are not product requirements.
