# IO implementation and release review

Reviewed 2026-10-03. Milestones 2–5 have been implemented and each received a separate read-only review agent. Review findings were incorporated and covered by appropriate checks. The previous renderer-spike documents are historical, not the current feature scope.

## Implemented scope

The workstation includes monitor, 104-key keyboard, faceted mouse, controller, two speakers, and a mounted webcam. One persistent Three.js scene and shared world remain throughout selection, focus, interruptions, and return. Focus entry uses device-specific camera/object poses and named easing; deep links shorten travel; focus-to-focus navigation passes through overview. Resize retargets ongoing motion. Reduced motion uses a short controlled cut and small final alignment.

All six testers are implemented. Adapters own browser APIs and plain observations; scene objects consume snapshots. Permissions require explicit Start controls. Media and sound stop on exit/background/Stop. Pending operations are generation-guarded. Track-ended, unsupported API, insecure context, permission denial, unavailable devices, and generic controller mapping receive restrained explanations.

Semantic device navigation, focus-scoped listeners, visible narrow-screen controls, projected annotation connectors, controlled live announcements, fullscreen monitor patterns, graphics context recovery, and a WebGL-free test surface are included. A precise CSS cursor provides ring/hover/pressed states with native, coarse-pointer, and forced-color fallbacks. No cursor smoothing or additional render loop is used.

Measurement/message text uses the paper color behind its small annotation area so RGB monitor patterns retain readable status on narrow viewports. This adds no card border or dashboard container.

## Specification mapping and explicit adjustments

Applicable: Product §§4–18; Technical §§2–36 and Milestones 2–5 in §38; Spatial §§4–15 and 21–22; Motion device transitions, interruption, reduced-motion, deep-link, and development inspection sections. The implementation preserves the architecture constraints in AGENTS.md.

The inherited renderer-spike camera remains `(126.5,-506.75,255)` looking at `(0,5,25)`, FOV 11°. Its pullback/target adjustment and monitor root `(-3,1.5,0)` are recorded in `review/RENDERER_SPIKE_REVIEW.md`. The monitor's 25 cm neck connects the existing foot and panel physically.

To fit the completed workstation and meet the reference horizontal-occupancy envelope, mouse root X is 60 cm, speakers are at approximately `(-60,13)` and `(27,16)`, and the controller is at `(-29,-20)` with -17° resting yaw. These are deliberate composition adjustments from the sheet's initial placements. Dimensions/support plane are retained. Named anchors and perspective projection determine focus/annotation placement; camera distance increases on narrow or very wide viewports. Models remain low-detail authored solids, not photorealistic assets.

Optional DOF/post-processing and WebHID are omitted. Background contrast recedes with authored material tones; no lighting system, duplicated focus devices, large UI framework, backend, or new production dependency was introduced. The suggested per-device scene-file layout is consolidated in workstation/keyboard constructors while adapter boundaries remain separate. Mobile is a reduced experience, not a promise of desktop peripheral support.

## Independent milestone review outcomes

| Milestone | Findings addressed |
| --- | --- |
| 2 — focus | Monitor framing/cropping, resize during motion, interrupted pose continuity, deterministic return, reduced-motion cut, and development scrub inspection. |
| 3 — keyboard/pointer | Reset restores input focus; chorded mouse presses use button-bit transitions; wheel rotation accumulates; fallback code mapping includes shifted punctuation/numpad; stale measurement accessibility labels clear on route changes. |
| 4 — remaining devices | Stop cancels pending AudioContext resume; new tones stop prior oscillators; ended output clears graphics; video texture preserves track aspect; speaker waves follow the selected channel and local driver anchors; generic controllers avoid false physical mapping. |
| 5 — compatibility/performance | Dynamic lines reuse GPU attributes and dispose old geometry before growth; unchanged live-region messages are not rewritten; fullscreen error status persists; fullscreen dimensions restore on focus exit without waiting for an asynchronous browser event. |

The final review of material batching and percentage viewport sizing found no new correctness issue. Face topology/normals are preserved; geometry is grouped by material instead of one draw per polygon.

## Verification evidence

- Automated suite: 56 tests across 10 files (final result recorded by the implementation run).
- Production build includes a successful TypeScript check. No extra runtime dependencies were installed.
- Windows Codex in-app Chromium: overview, deep links, semantic navigation, focus-to-focus corridor, Back/Forward, keyboard input, Reset/refocus, monitor grid/fullscreen entry/exit, idle camera/audio/controller controls, and a forced WebGL-free keyboard test exercised.
- Browser console inspection found no warnings/errors during the tested interactions.
- Six independently recaptured local images pass the comparison thresholds: normalized mean error ≤0.005 and changed-pixel fraction ≤1%, with channel delta >24 counting as changed. Measured local viewports were 692×433 and 615×346; the automation surface's viewport scaling prevented accepting the prescribed desktop goldens. The required desktop manifest is retained separately. Those local comparisons verify repeatability only, not design approval at 1440×900.
- Debug observation: overview draws fell from 709 to 197 after material batching, at 11,504 triangles. This is a renderer count, not proof of 60 fps on integrated graphics. Startup long tasks were observed in the local tool; interaction budget acceptance remains pending.
- Vite reports a roughly 620 kB minified JS bundle (~160 kB gzip), above its default 500 kB warning threshold. The build succeeds; Three.js is the only runtime dependency. No warning threshold was raised to hide this observation.

## Manual release matrix

Record actual browser/version, OS, device model, result, and evidence when running these checks. No real camera/microphone permission was granted by the agent and no hardware result is inferred from API exposure or mocks.

| Check | Current evidence | Required before production acceptance |
| --- | --- | --- |
| Chromium / Windows | Local in-app browser interactions and console checked | Repeat on an ordinary current desktop browser with physical peripherals |
| Firefox / Windows or macOS | Feature detection and normalized errors implemented | Navigation, lines, input, fullscreen, media, audio, controller |
| Safari / macOS | Compatibility paths implemented | Same representative matrix; document unsupported haptics/APIs |
| Keyboard | Synthetic input + mock listener lifecycle | ANSI/ISO representative devices, combinations, OS-reserved shortcuts, layout fallback |
| Mouse | Event normalization and visual response implemented | Representative high-rate mouse, coalescing, chords, horizontal wheel, browser estimate labeling |
| Camera | Deferred/denied/insecure/disconnected lifecycle tests | Allow/deny, busy/missing device, actual video aspect/settings, exit/background indicator shutdown |
| Microphone/audio | Pending-resume cancellation and lifecycle tests | L/R/both audibility, conservative level, waveform/RMS, no monitoring, indicator shutdown |
| Controller | Raw normalization and generic mapping tests | Standard + nonstandard hardware, hotplug, selection, analog triggers/sticks, haptics if available |
| Desktop visual acceptance | Numerical framing/support/occlusion tests; smaller local images | Accepted 1440×900 overview/focus/reduced-motion and 1280×720 goldens using required manifest |
| Integrated GPU | DPR cap, idle draw skipping, buffer reuse, material batching | Steady 60 fps at reference viewport; no ~50 ms interaction long tasks; profile all transitions/testers |
| Accessibility | Semantic controls, live-region throttling, focus/refocus implemented | Screen reader pass, keyboard-only pass, forced colors, real reduced-motion preference |
| Context/navigation lifecycle | Guards and shared clock implemented | Context loss/restore, background tabs, BFCache, rapid navigation while permission pending |

## Release status

Implementation and local verification are complete as a release candidate. The unobserved physical-device, browser, desktop visual, and integrated-GPU checks above are release gates. Passing a build or mocked API tests does not establish full production readiness. No hosting or deployment was performed.
