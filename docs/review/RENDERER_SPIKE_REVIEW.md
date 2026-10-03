# Renderer spike review

Reviewed 2026-10-03. Scope: Technical §38 Milestone 0 only.

## Delivered

- Persistent monitor chassis, inset display, stand foot and neck.
- Keyboard wedge/slab with an inset construction line, no individual keys.
- Faceted mouse loft with a minimal wheel marker.
- Authored unlit face tones, view-dependent silhouettes, wide construction lines,
  and procedural contact footprints on the invisible Z=0 desk.
- Development grid, bounds, anchors, camera readout, flat mode, and no-shadow mode.

## Evidence

Captures in `artifacts/renderer-spike/`:

| Capture | Review |
| --- | --- |
| `overview-1440x900.jpg` | Shared dimetric-style perspective, thickness, stand occlusion, contact footprints |
| `overview-1280x720.jpg` | Clear frame margins, same layout and line hierarchy at the minimum desktop review size |
| `flat-1440x900.jpg` | Device silhouettes and front/back ordering without face tones or shadows |
| `no-shadow-1440x900.jpg` | Geometry explains volume without relying on contact shadows |

Browser console: no warnings or errors observed during these captures. The screenshot
browser used DPR=1. Wide-line materials explicitly use CSS viewport dimensions;
pixel-ratio behavior is implemented but DPR=2 has not been visually reviewed here.

Automated spatial checks cover Z=0 support, actual keyboard-over-stand ray occlusion,
in-frame physical geometry at 1440×900 and 1280×720, shadows remaining on the desk
when VisualRoot lifts, distinct line widths after resize, and flat-mode suppression.
Together with existing reducer, routing, and motion tests, 39 tests pass.

## Construction tuning

The sheet's numeric baseline placed the monitor almost at the top frame edge and
left the keyboard visually separated from the stand. To fulfill its relational
requirements, this spike tunes the shared camera and monitor world transform:

- Overview camera: 15% pullback, target Z=25 instead of 20. Position is
  `(126.5, -506.75, 255)`, target `(0, 5, 25)`; FOV remains 11° and viewing direction
  remains equivalent to the sheet baseline.
- Monitor root: Y=1.5 rather than 26. This creates a slight physical occlusion with
  the keyboard. No projected-position adjustments are used.
- Monitor neck: height 25 instead of 22 cm, connecting the 1.6 cm foot to the
  panel's lower edge at Z=25. Panel remains 61×4×35 cm, top Z=60.
- Keyboard and mouse retain the sheet's baseline world positions, yaws, and primary
  dimensions. The tiny mouse wheel marker adds 0.15 cm above the shell.

These values are a three-device composition proof. Revisit the complete arrangement
when the controller, speakers, and webcam arrive. The full six-device occupancy and
three-overlap acceptance criteria are not claimed yet.

## Remaining scope

No input adapters, hit targets, functional selection, focus choreography, media
permissions, realistic lighting, or post-processing were added. Hash routes still
exercise the state lifecycle while unregistered focus poses retain the overview.
Full device-detail and performance/native-refresh acceptance require later review.

Next: Milestone 1 static workstation, followed by Milestone 2 focus transitions.
