# IO — Motion Storyboard

**Companion documents:** IO Product & Interaction Specification; IO Technical Implementation Specification; IO Spatial Construction Sheet

This document specifies how IO moves. It defines the motion grammar, state transitions, timing, camera choreography, object choreography, detail reveals, metric entrance, and input activation for the overview and every core device.

The primary motion principle is:

> **The camera reveals depth; objects confirm it.**

The scene should never feel like a collection of assets flying around to create spectacle. Most spatial change comes from the camera. Device motion is restrained, physical, and subordinate.

---

## 1. Motion hierarchy

IO uses four motion layers.

### Layer 1 — immediate input response

Examples:

- key depression;
- mouse button compression;
- controller button press;
- wheel rotation;
- trigger travel.

Target latency: next practical rendered frame.

Typical duration:

```text
press     45–90 ms
release   70–140 ms
```

These are the fastest motions in the product.

### Layer 2 — object acknowledgement

Examples:

- hover lift;
- hover rotation;
- contact-shadow separation;
- selection compression before camera travel.

Typical duration:

```text
90–180 ms
```

### Layer 3 — scene/camera navigation

Examples:

- overview to device focus;
- returning to overview;
- camera alignment with monitor/webcam;

Typical duration:

```text
520–680 ms
```

The camera feels heavy and intentional. It should not bounce.

### Layer 4 — ambient/diagnostic motion

Examples:

- pointer trail decay;
- monitor motion-test target;
- speaker wave propagation;
- audio waveform;

These run only when functionally relevant.

---

## 2. Motion character

### Camera

The camera is:

- controlled;
- massy;
- precise;
- low-overshoot;
- mostly ease-out on arrival;
- never springy.

### Devices

Devices are:

- faster;
- tactile;
- allowed small spring response;
- never rubbery;
- constrained by believable hinges/contact points.

### Background

Background objects mostly stay put. They recede because camera, contrast, detail, and focus change—not because they scatter away.

---

## 3. Easing vocabulary

Use a small, named easing vocabulary so every transition feels related.

### `CAMERA_OUT`

For primary camera arrival.

```text
cubic-bezier(0.22, 0.74, 0.18, 1.00)
```

Character: fast enough to feel responsive, long controlled tail.

### `CAMERA_IN_OUT`

For arcs or projection/FOV changes that need smooth departure and arrival.

```text
cubic-bezier(0.65, 0.00, 0.22, 1.00)
```

### `OBJECT_OUT`

For lift/translation.

```text
cubic-bezier(0.20, 0.85, 0.25, 1.00)
```

### `OBJECT_SPRING`

Use a critically damped or lightly under-damped spring for tactile controls only.

Suggested conceptual parameters:

```text
stiffness: 420–520
 damping:   30–38
 mass:      1
```

Do not apply this spring to the camera.

### `FADE_OUT`

For detail/annotation opacity:

```text
cubic-bezier(0.25, 0.00, 0.30, 1.00)
```

---

## 4. Frame notation

Storyboards use both milliseconds and normalized progress.

For a 620 ms transition:

```text
T0    = 0 ms      = 0.00
T1    = 70 ms     = 0.11
T2    = 180 ms    = 0.29
T3    = 360 ms    = 0.58
T4    = 520 ms    = 0.84
T5    = 620 ms    = 1.00
```

The exact duration may tune by ±60 ms if the visual rhythm requires it, but choreography order should remain intact.

---

## 5. Overview idle state

The overview is nearly still.

Allowed motion:

- pointer-driven parallax no greater than roughly 0.25–0.5° camera target deviation;
- optional 1–2 mm equivalent object response to pointer proximity;
- no autonomous floating loop;
- no continuous camera drift;
- no breathing scale animation.

If parallax cannot be implemented without making the scene feel unstable, omit it.

The default scene should tolerate the cursor being stationary for a minute without looking unfinished.

---

## 6. Device hover storyboard

Duration: **120–160 ms**.

### `T0 — neutral`

- device at canonical transform;
- contact shadow compact;
- standard silhouette weight;
- cursor ring neutral.

### `T1 — 40 ms`

- silhouette emphasis begins;
- cursor expands subtly;
- device begins a `+Z` lift.

### `T2 — 120–160 ms`

- hover lift reaches approximately `+0.35–0.60 cm`;
- device rotates no more than `0.5–1.25°` toward camera;
- contact shadow remains on desk, becoming slightly softer/lighter;
- no label appears.

### Hover exit

Return in roughly **120 ms**, slightly faster than entry.

Do not overshoot the desk plane.

---

## 7. Selection acknowledgement

Before full camera travel, provide an immediate physical acknowledgement.

Duration: first **70–90 ms** of every focus transition.

Sequence:

1. selected object compresses or settles by a tiny amount from hover state;
2. cursor press state fills;
3. selected outline becomes decisively active;
4. camera begins movement no later than approximately 60–80 ms after activation.

The user should never wonder whether the click registered.

---

## 8. Shared focus-transition choreography

Default total: **620 ms**.

All device transitions use the same broad rhythm.

### Phase A — `0–90 ms`: acknowledgement

- selected device responds locally;
- hover states on other devices lock;
- input for overview navigation is temporarily gated;
- contact shadow begins separation if the device will lift.

### Phase B — `60–250 ms`: spatial opening

- camera leaves overview pose;
- FOV widens from approximately 11° toward device-specific focus FOV;
- camera target moves decisively toward the selected device;
- selected object performs its small lift/local alignment;
- background detail begins simplifying.

### Phase C — `220–480 ms`: useful orientation

- selected device becomes dominant in frame;
- camera elevation/azimuth approaches final inspection angle;
- device-specific fine detail resolves;
- optional background blur begins only after spatial separation is already obvious.

### Phase D — `450–580 ms`: instrument activation

- device metrics/annotations enter;
- device input adapter activates when doing so cannot interfere with transition;
- selected object reaches exact test orientation;
- background contrast reaches focused-state target.

### Phase E — `580–620 ms`: settle

- camera comes fully to rest;
- no bounce;
- any tiny device spring completes;
- tester is fully interactive.

---

## 9. Overview → Keyboard storyboard

**Target duration:** 640 ms  
**Final camera:** approximately `(18, -92, 95)`, target `(0, -14, 2.5)`, FOV `27°`  
**Hero idea:** the diagram folds into a near top-down keyboard inspection without replacing the keyboard.

### Frame 0 — overview / `0 ms`

The complete workstation is visible. Keyboard is foreground-center, resting at its canonical `-4°` yaw.

### Frame 1 — press / `0–70 ms`

- keyboard top plate settles downward by roughly `0.15 cm` if currently hovered;
- contact shadow tightens for a beat;
- silhouette strengthens;
- no other object moves yet in world space.

This gives a tactile click before the large move.

### Frame 2 — lift and camera departure / `70–190 ms`

- keyboard `VisualRoot` lifts toward `+1.5 cm`;
- keyboard yaw eases from `-4°` toward `-2°`;
- camera target shifts rapidly from workstation center to keyboard center;
- FOV opens from `11°` toward roughly `18–20°`;
- camera elevation starts increasing;
- monitor and speakers begin moving toward the upper background through parallax.

### Frame 3 — flattening perspective / `190–390 ms`

- keyboard continues to approximately `+2.0 cm` lift;
- yaw approaches `0°`;
- camera climbs toward its near top-down focus pose;
- keyboard occupies approximately 55–65% of viewport width by the end of this phase;
- simplified overview keys transition into full addressable key geometry;
- contact shadow remains on desk and separates visually from chassis.

Important: do not literally rotate the keyboard to perfectly face the camera. Let the camera do most of the flattening so chassis depth remains visible.

### Frame 4 — tester reveal / `390–560 ms`

- camera arrives close to final pose;
- keyboard reaches approximately 68–76% viewport width;
- monitor remains identifiable in upper background;
- mouse remains partially visible at right;
- controller remains as a soft lower-left/rear context element where framing allows;
- background construction detail reduces;
- mild DOF may enter;
- metric anchors appear in available negative space, but values need not animate from zero.

### Frame 5 — live / `560–640 ms`

- keyboard adapter becomes fully active;
- all full key hit/visual objects are enabled;
- camera finishes without overshoot;
- keyboard lift settles to its final focus value;
- first physical key press can now depress its rendered key immediately.

### Keyboard focus behavior

Key press:

```text
0–55 ms     keycap travels downward 1.5–2.5 mm equivalent
0–55 ms     face inverts toward black
release     80–120 ms spring return
```

Multiple keycaps animate independently.

### Keyboard exit

Target: **520–580 ms**.

Choreography:

1. hide/fade annotations first over ~80 ms;
2. disable tester-specific browser behavior while still preserving final keyup cleanup;
3. camera begins retreat;
4. detailed key group simplifies during movement;
5. keyboard lowers to desk and restores `-4°` yaw late in transition;
6. contact shadow recompresses only as chassis returns to rest;
7. overview hover becomes available once camera is within final 10–15% of its path.

Do not simply reverse the entry easing.

---

## 10. Overview → Mouse storyboard

**Target duration:** 600 ms  
**Final camera:** approximately `(62, -87, 63)`, target `(31, -13, 3)`, FOV `30°`  
**Hero idea:** the desk around the mouse becomes the movement instrument.

### Frame 0 — overview / `0 ms`

Mouse rests foreground-right.

### Frame 1 — press / `0–70 ms`

- relevant shell/button region compresses subtly;
- contact shadow tightens;
- mouse silhouette strengthens.

### Frame 2 — peel from desk / `70–190 ms`

- mouse lifts to approximately `+1.2 cm`;
- shell rotates by roughly `1–2°` toward camera;
- camera begins an arc toward the right foreground;
- FOV opens toward `20°`;
- keyboard grows into a strong nearby background plane because of parallax.

### Frame 3 — inspection angle / `190–370 ms`

- mouse reaches `+1.8–2.2 cm` lift;
- final local rotation makes left/right buttons and wheel unambiguous;
- camera settles into a three-quarter/top view;
- pointer movement region is implicitly the visible desk/negative space around the mouse;
- mouse reaches approximately 30–38% of viewport width.

### Frame 4 — diagnostic surface / `370–520 ms`

- subtle movement-trail layer becomes available;
- click interval annotation and event-rate annotation enter in negative space;
- wheel detail resolves;
- background contrast reduces modestly;
- right-click context-menu suppression becomes active only now.

### Frame 5 — live / `520–600 ms`

- pointer adapter is in active test mode;
- mouse occupies approximately 34–44% viewport width;
- movement samples can begin immediately;
- no animated sample should play before the user actually moves the mouse.

### Mouse live motion

Button press:

- corresponding shell region travels approximately `0.8–1.5 mm` equivalent;
- 45–70 ms down;
- 80–120 ms release.

Wheel:

- rotate proportionally to normalized wheel delta;
- clamp one event's visible rotation to prevent absurd jumps;
- accumulate smoothly with a short 60–90 ms interpolation.

Movement trail:

- sample positions in screen/desk test coordinates;
- cap point count;
- fade individual segments over roughly 350–700 ms;
- never leave a permanent scribble.

### Mouse exit

Stop/clear the movement trail early in exit. Release context-menu suppression before overview is fully restored.

---

## 11. Overview → Monitor storyboard

**Target duration:** 680 ms  
**Final camera:** approximately `(-1, -54, 49)`, target `(-3, 26, 42)`, FOV `30°`  
**Hero idea:** the camera enters the monitor; the monitor does not fly toward the user.

### Frame 0 — overview / `0 ms`

Monitor is the rear architectural anchor.

### Frame 1 — activation / `0–80 ms`

- display surface gives a minimal acknowledgement: tiny contrast pulse or 1–2 px-equivalent inset response;
- stand remains planted;
- no monitor lift.

### Frame 2 — camera rises through foreground / `80–240 ms`

- camera target shifts from workstation center to display center;
- camera moves forward and slightly upward;
- keyboard and controller slide downward/outward in the frame due to parallax, not world translation;
- FOV opens from `11°` toward `20–24°`;
- monitor convergence becomes more apparent.

### Frame 3 — face alignment / `240–450 ms`

- camera aligns progressively with display normal;
- panel grows to approximately 70–85% viewport width;
- bezel internal line becomes stronger/cleaner;
- speaker/webcam remain briefly visible at edges to preserve physical context;
- display content transitions from idle graphic to the currently selected test surface.

### Frame 4 — threshold / `450–590 ms`

- panel reaches approximately 90–100% viewport coverage;
- bezel may remain visible as a thin physical frame;
- workstation context is reduced to edges/corners;
- monitor test controls appear as tiny geometric marks on/near the bezel;
- repaint measurement begins collecting only after the main camera transition stops influencing frame timing.

### Frame 5 — live / `590–680 ms`

- camera locks to final display-facing pose;
- test surface is stable;
- rAF measurement discards transition samples and begins a clean sample window;
- display test modes become interactive.

### Monitor internal mode transitions

Mode changes should not move the camera.

Solid field:

- immediate or 80–120 ms wipe/fill, depending on test integrity;
- for dead-pixel inspection, allow a truly static full field without decorative motion.

Gradient/grid:

- 120–180 ms graphic transition permitted.

Motion test:

- test target movement is functional and may run continuously until mode changes.

### Monitor exit

Before retreating, return from any fullscreen-like display mode to the physical bezel state over 80–140 ms. Then camera pulls back to overview.

---

## 12. Overview → Webcam storyboard

**Target duration:** 650 ms  
**Final camera:** approximately `(10, -36, 66)`, target at webcam lens, FOV `31°`  
**Hero idea:** the webcam lens becomes the live image portal.

### Frame 0 — overview / `0 ms`

Webcam is physically mounted to the monitor.

### Frame 1 — acknowledgement / `0–80 ms`

- outer lens ring contracts or rotates by a tiny amount;
- webcam body tilts no more than 1°;
- monitor remains still.

### Frame 2 — camera approach / `80–260 ms`

- camera rises toward the monitor top edge;
- target locks onto lens center;
- monitor panel becomes a large background plane;
- webcam housing grows rapidly in frame;
- FOV opens.

### Frame 3 — lens dominance / `260–450 ms`

- lens reaches approximately 28–36% viewport width;
- inner lens rings expand slightly in local geometry;
- housing remains visible around the lens;
- camera permission request may be initiated only from the user's explicit selection action; do not request on hover.

If permission latency outlasts the motion, settle into a graphical waiting state rather than freezing the camera transition.

### Frame 4 — lens-to-video morph / `450–590 ms`

When a stream is ready:

- inner lens aperture expands into a rounded video viewport;
- transition should preserve the circular/elliptical lens geometry for the first half of the morph;
- housing remains as a physical border/reference;
- camera metadata enters at the edge of the video area.

If permission is pending, hold the aperture in a quiet closed/neutral state.

### Frame 5 — live / `590–650 ms` plus permission latency

- live video surface is active;
- width × height, FPS, and aspect ratio may appear compactly;
- no additional camera move is required when metadata arrives.

### Permission denied

Do not shake the camera or show a large modal.

Instead:

- aperture closes;
- a minimal slash/lock geometry appears;
- accessible text communicates denial;
- overview return remains immediately available.

---

## 13. Overview → Controller storyboard

**Target duration:** 620 ms  
**Final camera:** approximately `(-48, -83, 65)`, target `(-29, -20, 3.5)`, FOV `30°`  
**Hero idea:** the controller rises just enough for analog depth and drift to become visually measurable.

### Frame 0 — overview / `0 ms`

Controller sits diagonally at lower-left, partially tucked under the keyboard.

### Frame 1 — release from overlap / `0–100 ms`

- controller lifts to clear its keyboard occlusion;
- lift reaches roughly `+1.0 cm` quickly;
- keyboard itself does not move out of the way;
- the change proves the controller was physically behind/below it.

### Frame 2 — camera arc / `100–260 ms`

- controller continues to `+2.5 cm` lift;
- yaw moves from `-17°` toward approximately `-6°` to `0°` depending on framing;
- camera arcs left/front and upward;
- FOV opens toward 22–26°.

### Frame 3 — control reveal / `260–440 ms`

- controller reaches 40–50% viewport width;
- sticks, gates, triggers, D-pad, and button cluster resolve to full detail;
- analog stick caps may perform no autonomous animation;
- device connection state becomes visible only if useful.

### Frame 4 — diagnostic overlay / `440–560 ms`

- optional stick-center/drift circles fade in around stick gates;
- axis/trigger values appear as sparse edge annotations;
- controller adapter polling is active;
- background device detail reduces.

### Frame 5 — live / `560–620 ms`

- controller reaches approximately 46–58% viewport width;
- stick movement maps 1:1 into visible cap displacement within the designed gate;
- button/trigger state becomes immediate.

### Controller live motion

Digital buttons:

- 45–70 ms depression;
- color inversion optional;
- 80–120 ms release.

Analog sticks:

- cap position follows actual axis each animation frame;
- avoid adding smoothing that hides drift;
- a tiny visual deadzone can be drawn, but do not silently apply it to displayed raw values.

Triggers:

- transform linearly with exposed analog value;
- spring back visually only as quickly as the reported value returns.

---

## 14. Overview → Audio storyboard

**Target duration:** 600 ms  
**Final camera:** selected speaker driver focus, FOV around `30°`  
**Hero idea:** the speaker cone becomes the origin of generated sound geometry.

### Frame 0 — overview / `0 ms`

Speakers frame the monitor.

### Frame 1 — selection / `0–80 ms`

- selected cabinet lifts only `0.4–0.8 cm` or remains planted;
- driver ring gains contrast;
- camera target begins moving toward the driver.

### Frame 2 — approach / `80–280 ms`

- camera moves toward speaker face;
- cabinet becomes approximately 25–35% viewport width;
- monitor remains recognizable behind/alongside it;
- driver rings resolve.

### Frame 3 — instrument reveal / `280–470 ms`

- speaker cone becomes the compositional center;
- channel/tone controls appear as tiny geometric controls near the cabinet or in adjacent negative space;
- generated sound remains off until the user explicitly triggers a test.

### Frame 4 — live / `470–600 ms`

- camera settles;
- speaker test controls are active;
- when a tone plays, cone motion and graphic wave propagation synchronize to signal amplitude/envelope, not literal acoustic displacement.

### Speaker wave motion

Use simple expanding line/ring geometry:

- spawn only while output is active;
- 400–900 ms travel/fade depending on composition;
- maximum 2–4 simultaneous wave fronts;
- do not turn the scene into a music visualizer.

### Microphone sub-focus

If a microphone object is included, its selection can use the same basic camera grammar. The live waveform grows out of the device/effect anchor rather than appearing as a detached dashboard.

---

## 15. Returning to overview

Default exit duration: **540 ms**.

The exit should feel like putting the instrument back into the workstation, not playing a reversed movie.

### Phase A — `0–90 ms`

- functional annotations retract/fade;
- transient trails/waves stop spawning;
- device-specific input capture begins clean shutdown;
- selected device remains visually stable.

### Phase B — `70–260 ms`

- camera begins retreat using `CAMERA_IN_OUT` or a slightly more accelerated departure than entry;
- FOV narrows toward 11°;
- selected device detail simplifies while still moving;
- background contrast returns.

### Phase C — `240–450 ms`

- selected device returns toward canonical local rotation;
- lifted device lowers toward support plane;
- contact shadow becomes tighter/darker as support approaches;
- overview object relationships re-form through real occlusion.

### Phase D — `450–540 ms`

- camera reaches exact overview pose;
- device reaches exact canonical rest transform;
- contact shadow reaches canonical footprint;
- overview hover/hit testing re-enables;
- no residual blur or focus-state detail remains.

The final overview frame must be pixel-consistent with the initial layout apart from any legitimate persistent tester state that design explicitly retains.

---

## 16. IO mark / home interaction

The small IO mark is the persistent return control during focus.

Interaction:

- hover: subtle fill/line-weight response only;
- click: begin focus exit immediately;
- no tooltip required visually;
- accessible name: “All devices” or “Return to all devices.”

Do not animate the mark across the screen during camera moves. It belongs to the viewport UI layer, not the 3D world.

---

## 17. Browser Back/Forward motion

Browser navigation invokes the same semantic camera transitions.

Rules:

- Back from a focused device returns to overview;
- Forward can restore the previously focused device;
- deep-link load may use a shortened 280–420 ms transition after scene initialization rather than snapping instantly;
- do not replay hover/selection acknowledgement when navigation originated from browser history.

---

## 18. Direct focus-to-focus navigation

The core interaction model should not require direct device-to-device switching while one device is active.

If a background device is intentionally made clickable in a focused state, implement switching as:

```text
current focus → partial overview corridor → next focus
```

Do not teleport the camera directly across the scene.

Until this choreography is explicitly designed and reviewed, the supported path is:

```text
overview → device → overview → device
```

This keeps navigation legible and preserves spatial memory.

---

## 19. Depth-of-field choreography

DOF is optional and must enter late.

Do not use blur to fake the beginning of a transition.

Suggested sequence:

```text
0–35%    no additional blur
35–65%   subtle background blur begins
65–100%  focused-state blur reaches target
```

Exit reverses the semantic sequence but should clear blur slightly earlier so the overview finishes crisp.

If performance is poor, remove DOF before reducing geometry/camera quality.

---

## 20. Detail-resolution choreography

Fine detail should resolve while the object is changing scale.

Recommended thresholds based on projected size:

- overview detail group only below ~35% viewport occupancy;
- transitional detail group between ~30–55%;
- full focus detail above ~50% where relevant.

Use short 80–150 ms crossfades or geometry visibility swaps masked by camera movement.

Never make the device visibly “redraw itself” after the camera has stopped.

---

## 21. Measurement annotation motion

Annotations are not hero animations.

Entry:

- begin in final 20–30% of focus transition;
- opacity 0 → 1 over 120–180 ms;
- optional 4–8 px-equivalent line extension from anchor;
- no large translation;
- no number-counting animation.

Live updates:

- update text/value at a throttled readable cadence;
- tabular numerals prevent width jitter;
- connecting line/anchor remains stable.

Exit:

- retract/fade before the camera meaningfully departs.

---

## 22. Morph rules

Morphing is allowed only when state A and state B are conceptually the same thing.

Approved examples:

- webcam lens → live video viewport;
- monitor display plane → monitor test surface;
- speaker cone → sound-wave origin;
- analog stick gate → drift visualization;
- mouse movement region → fading path visualization.

Avoid morphing:

- device body into generic UI cards;
- keyboard into a dashboard;
- unrelated icons into controls;
- the entire scene into a different visual metaphor.

Morphs should preserve at least one stable geometric boundary so the user can track continuity.

---

## 23. Reduced-motion storyboard

Respect `prefers-reduced-motion` without changing information architecture.

### Overview hover

- remove lift rotation;
- use 80–120 ms contrast/outline response.

### Focus transition

Target **140–220 ms**.

Use:

- shorter camera travel or a controlled cut between near poses;
- minimal FOV change;
- no parallax flourish;
- no spring settling;
- no DOF animation.

The selected object remains spatially continuous where possible.

### Live input

Keep functional input movement because it communicates test results, but reduce decorative overshoot.

Examples:

- keyboard key still depresses;
- controller stick still moves;
- mouse trail can be simplified or disabled;
- speaker waves may be reduced to a small amplitude indicator.

---

## 24. Interruption and input-lock rules

Transitions must be interruptible without corrupting scene state.

### During entry

If user requests overview before focus completes:

- retarget camera from its current interpolated pose;
- do not snap to the focus endpoint first;
- suppress device metrics that have not yet entered;
- return selected VisualRoot cleanly to canonical pose.

### During exit

Repeated home/back input should be ignored once exit is underway.

### Hover during camera travel

Disable overview hover selection during focus entry/exit. Otherwise devices can animate beneath a moving camera and create noise.

### Device input activation

Do not capture/suppress device-specific browser behaviors until the relevant tester is close to active state.

---

## 25. Loading and first-frame motion

Do not use a branded intro animation.

Preferred loading behavior:

1. background and IO mark appear immediately;
2. major scene silhouettes render as soon as available;
3. optional 280–450 ms construction settle may bring objects from a 2–4 px-equivalent offset into exact rest positions;
4. scene becomes hoverable as soon as hit geometry is valid.

If assets load quickly, skip the settle entirely.

The first meaningful content is the workstation, not the logo.

---

## 26. Error-state motion

Errors should be calm, local, and reversible.

### Camera denied

- aperture closes over 120–180 ms;
- lock/slash mark resolves;
- no shake.

### Microphone denied

- waveform contracts to a line;
- minimal slash/lock state appears.

### Controller absent

- controller remains selectable if discovery flow is useful;
- focused state may show disconnected geometry or a cable-end/device-state cue;
- do not pulse continuously waiting for connection.

### Unsupported measurement

- annotation should simply not appear, or retract once capability is known to be unavailable.

No error should trigger a page-level transition.

---

## 27. Performance constraints for motion

Motion quality depends on frame stability more than effect count.

Required priorities:

1. camera interpolation;
2. active device physical response;
3. line stability;
4. core input visualization;
5. contact shadows;
6. metrics;
7. DOF and decorative effects.

If frame time exceeds budget, remove effects from the bottom of that list first.

Do not preserve blur at the expense of camera smoothness.

---

## 28. Motion instrumentation

Add development-only telemetry:

```text
current scene state
transition name
transition progress 0..1
camera position
camera target
camera FOV
selected device local transform
current FPS / frame time
active input adapter
```

Add a scrub mode for each named transition so designers/developers can inspect arbitrary progress values without replaying the animation manually.

Recommended API shape:

```ts
motion.preview('overviewToKeyboard', 0.58)
```

A scrubber is especially useful for validating occlusion, detail swaps, and line behavior at the midpoint of transitions.

---

## 29. Storyboard review checkpoints

Review every focus transition at these normalized frames:

```text
0.00  overview
0.15  acknowledgement / departure
0.35  spatial opening
0.60  dominant device framing
0.85  tester reveal
1.00  active focus
```

At each checkpoint ask:

- Is it obviously the same object as the overview object?
- Can the viewer still infer where the object lives in the workstation?
- Is the camera doing more work than the object's translation?
- Do line weights remain controlled?
- Is the selected object gaining useful orientation rather than merely growing?
- Are background objects receding naturally through perspective/occlusion?
- Is any text or metric arriving before it is useful?

---

## 30. Motion acceptance criteria

The motion system is accepted when:

- device selection produces a visible response within roughly one rendered frame to 80 ms;
- overview-to-focus reaches a useful test state in no more than roughly 700 ms under normal motion settings;
- no focus transition fades one device out and substitutes another copy;
- camera paths remain spatially coherent with the construction sheet;
- selected objects move only as much as needed; camera movement provides most of the transformation;
- background devices remain part of the same room rather than becoming a decorative blur layer;
- input controls feel faster and lighter than the camera;
- the camera never springs or bounces;
- keyboard, mouse, controller, monitor, webcam, and audio transitions share a recognizable timing grammar without being identical;
- monitor focus feels like entering the screen;
- webcam focus preserves the physical lens-to-live-view relationship;
- controller lift visibly resolves its initial overlap with the keyboard;
- returning to overview reconstructs the exact canonical composition;
- reduced-motion mode preserves usability and device continuity;
- interrupted transitions retarget cleanly without snapping;
- tester-specific input capture starts and stops at safe points in the choreography;
- the experience remains visually convincing with DOF disabled.

---

## 31. Recommended implementation order

Build and review motion in this order:

1. overview camera lock and hover lift;
2. overview → keyboard → overview;
3. overview → mouse → overview;
4. overview → monitor → overview;
5. camera transition interruption and browser Back;
6. controller transition;
7. webcam transition and permission-latency states;
8. audio transition;
9. detail-resolution swaps;
10. measurement annotations;
11. optional DOF;
12. reduced-motion variants.

Do not build every transition simultaneously. Keyboard, mouse, and monitor establish the motion language for the entire product.
