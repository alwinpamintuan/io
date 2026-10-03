# IO Engineering Instructions
IO - A space for your devices

IO is a static client-side peripheral testing application.

Before making architectural, spatial, interaction, or visual changes, read:
- docs\IO_Product_Interaction_Spec.md
- docs\IO_Technical_Implementation_Spec.md

For spatial geometry or camera work also read:
- docs\IO_Spatial_Construction_Sheet.md

For animation work also read:
- docs\IO_Motion_Storyboard.md

## Non-negotiable architecture

- One persistent Three.js scene.
- One shared world coordinate system.
- Devices are never recreated when entering focus.
- Device adapters never manipulate Three.js objects directly.
- Use explicit scene state rather than scattered booleans.
- Use one application render loop.
- Browser-derived measurements must never be represented as direct hardware telemetry.

## Visual priorities

1. coherent projection
2. silhouette
3. occlusion
4. grounding
5. line hierarchy
6. motion continuity
7. fine detail

Do not introduce photorealistic lighting, large UI frameworks,
dashboard/card UI, or unnecessary dependencies.

## Workflow

Before implementing a task:
1. inspect relevant existing code;
2. identify the applicable specification sections;
3. state the implementation approach;
4. make the smallest coherent change;
5. run tests/typecheck/build;
6. report deviations from specification explicitly.

Do not silently reinterpret the product specification.