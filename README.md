# IO — A space for your devices

A static, client-side peripheral tester built with TypeScript and Three.js. Six persistent devices share one desk, world, camera, and render loop. Select a device to test it; the IO mark returns to the workstation.

## Run and build

Node.js 22.12 or newer is required (verified with Node.js 24).

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

Deploy the contents of `dist/` to a static HTTPS host. Assets use relative URLs and navigation uses hashes, so no server route rewrites, backend, database, or API keys are needed. Camera and microphone access require a secure context; localhost is suitable for development. Open the site as HTTP(S), rather than opening the HTML file directly. Hosting inside an iframe may require camera, microphone, fullscreen, and gamepad permission policies from the embedding page.

## Testers

- **Keyboard:** a full 104-key ANSI model, independent held/tested states, key combinations, last key, hold/repeat timing, and Reset. Physical `code` is preferred, with character/location fallback. Browser and OS shortcuts remain reserved.
- **Mouse:** button states, wheel direction/accumulation, click intervals, short movement trails, and a rolling estimate of browser-delivered event frequency. Coalesced events are used when available; this is not hardware polling-rate telemetry.
- **Monitor:** white, black, gray, RGB, grayscale gradient, grid/circle, moving bar, and repaint cadence. Fullscreen is explicit. Repaint cadence is a browser estimate, not measured panel response time or a guaranteed hardware refresh rate.
- **Webcam:** explicit Start/Stop, local preview on the mounted camera, available track width/height/frame-rate/aspect settings, and normalized permission/device errors.
- **Controller:** connection detection, controller selection, standard physical button/stick mapping, raw axis values and rest offsets, generic indexed mapping, and an optional brief haptic pulse where supported.
- **Audio:** one-second conservative 220/440/880 Hz left/right/both tones, Stop tone, optional microphone waveform and digital RMS amplitude, and explicit Stop microphone. The microphone is never played through speakers. Digital amplitude is not calibrated sound pressure.

Routes are `#keyboard`, `#mouse`, `#monitor`, `#camera`, `#controller`, and `#audio`. Empty/unknown hashes show overview. Deep links and Back/Forward work during transitions. Keyboard users can Tab to semantic device buttons; narrow viewports expose the buttons visibly. Reduced motion uses a short controlled camera cut. If WebGL2 initialization fails, the same adapters remain available through semantic controls and a 2D test surface.

### Device selection across viewport sizes

In the 3D overview, viewports wider than 700 CSS pixels use the illustrated devices as pointer targets. Device-name buttons remain in the semantic navigation and reveal themselves when focused with Tab. At 700 CSS pixels or less, all device buttons are visible in overview to make selection easier on small screens. This is a responsive layout rule; no browser accessibility option is required. The WebGL-free fallback always exposes its device navigation.

## Privacy and lifecycle

IO has no analytics, upload, recording, persistent diagnostic storage, or external runtime assets. Device observations stay in memory on the page. Camera/microphone permission is requested only by the corresponding Start button; selecting a device does not prompt. Stop, leaving focus, backgrounding the page, or shutdown stops media tracks and audio. Stale asynchronous requests cannot reactivate devices after cancellation. Browser permission preferences are managed by the browser.

## Architecture

- `src/app`: explicit state/revisions, hash routing, capabilities, the single RAF owner, compatibility surface, and development inspection.
- `src/scene`: one persistent scene and perspective camera; cancellable choreography; unlit authored solids; CSS-pixel silhouette/construction/detail lines; desk contact shadows; reusable line buffers; instanced keycaps and shared legend atlas.
- `src/input`: focus-scoped adapters publish plain snapshots and never manipulate Three.js objects. Active controller/monitor/audio polling joins the shared clock. Metrics update at a restrained cadence; screen-reader announcements report discrete state changes.
- `src/overlay`: semantic controls and small measurements anchored to projected world points.
- `src/main.ts`: wiring, selection, resizing, context recovery, and symmetric cleanup.

World units are centimeters: X right, Y toward the rear, Z up, desk Z=0. Device visual roots move in focus while the resting desk shadows remain attached to their supports. The webcam stays parented to the monitor mount. Pixel ratio is capped at 2. Idle scene redraws are skipped. Face polygons sharing a material are batched into a single draw group.

The authoritative documents are in `docs/`. The complete implementation review, spatial adjustments, milestone reviews, and remaining release gates are recorded in `docs/IMPLEMENTATION_REVIEW.md`. The earlier renderer-spike review remains historical evidence.

## Development inspection

These flags only operate in development:

```text
/?debugFlat
/?debugNoShadow
/?debugGrid&debugBounds&debugAnchors&debugCamera&debugHitTargets
/?debugMotion
/?debugReducedMotion
/?debugFallback
```

Motion inspection exposes transition selection/scrubbing, scene state, progress, camera pose, local transform state, active adapter, observed frame timing, draw calls, triangle counts, and long-task observations. Resume restores ordinary navigation.

## Verification

Tests cover routing/state revisions, persistent geometry/supports/occlusion, focus interruptions and resize, reduced motion, line buffer reuse, key mapping/listeners, timing windows, deferred media cancellation/errors, audio cancellation, gamepad normalization, and fullscreen aspect restoration. Build includes TypeScript checking.

Visual comparison uses Pillow as a development-only QA dependency:

```sh
python scripts/compare_visuals.py artifacts/release/local/current
```

Six independently captured local states and their measured sizes are in `artifacts/release/local/`. Only changing annotation text is masked. The browser automation surface rendered smaller CSS viewports than requested, so those captures do **not** certify the prescribed desktop reference sizes. `artifacts/release/required-desktop-visual-manifest.json` preserves the required 1440×900/1280×720 capture plan for release acceptance.

This is a buildable release candidate. Physical device, Firefox/Safari/macOS, fixed desktop visual acceptance, and integrated-GPU performance checks still require the manual matrix in the implementation review before a production-readiness claim.
