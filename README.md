# IO — A space for your devices

A static, client-side peripheral tester built with TypeScript and Three.js. Seven persistent devices share one desk, world, camera, and render loop. Select a device to test it; the IO mark returns to the workstation.

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
- **Monitor:** 16 inspection patterns, including near-black/white steps, color ramps, grid/circle, alternating pixels, adjustable motion, and repaint cadence. A glyph rail and motion controls remain available in fullscreen. Repaint cadence is a browser estimate, not measured panel response time or a guaranteed hardware refresh rate.
- **Webcam:** explicit Start/Stop, an adjacent local viewing frame connected to the mounted camera, contain-fit video, mirror preference, reported track settings, and normalized permission/device errors.
- **Controller:** connection/selection, standard physical button/stick mapping, Neutral/Xbox/PlayStation display legends, raw axes and vector scopes, generic indexed mapping, and optional feature-detected haptics. Display styles do not change mapping.
- **Audio:** conservative one-second 220/440/880 Hz left/right/both output tones and Stop, with channel-gated wavefronts.
- **Microphone:** independent Start/Stop, local waveform and digital RMS amplitude. Input is never played through speakers. Digital amplitude is not calibrated sound pressure.

Routes are `#keyboard`, `#mouse`, `#monitor`, `#camera`, `#controller`, `#audio`, and `#microphone`. Empty/unknown hashes show overview. Deep links and Back/Forward work during transitions. Keyboard users can Tab to semantic device buttons; narrow viewports expose the buttons visibly. Reduced motion uses a short controlled camera cut. If WebGL2 initialization fails, the same adapters remain available through semantic controls and a 2D test surface.

### Device selection across viewport sizes

In the 3D overview, viewports wider than 700 CSS pixels use the illustrated devices as pointer targets. Device-name buttons remain in the semantic navigation and reveal themselves when focused with Tab. At 700 CSS pixels or less, all device buttons are visible in overview to make selection easier on small screens. This is a responsive layout rule; no browser accessibility option is required. The WebGL-free fallback always exposes its device navigation.

## Privacy and lifecycle

IO has no analytics, upload, recording, persistent diagnostic storage, or external runtime assets. Device observations stay in memory on the page. Camera/microphone permission is requested only by the corresponding Start button; selecting a device does not prompt. Stop, leaving focus, backgrounding the page, or shutdown stops media tracks and audio. Stale asynchronous requests cannot reactivate devices after cancellation. Browser permission preferences are managed by the browser.

## Engineering

See [IO principles](docs/IO_Principles.md) for the current product, spatial, motion, architecture, and measurement rules.

Run `npm test`, `npm run typecheck`, and `npm run build` when changing the application. Authored device control points live in `scripts/author-devices.mjs`; run `node scripts/author-devices.mjs` to regenerate `assets/devices.gltf`.

Development inspection flags include `debugVisual`, `debugFlat`, `debugSilhouette`, `debugNoShadow`, `debugMotion`, `debugReducedMotion`, and `debugFallback`, supplied as URL query parameters. They are excluded from production.

`scripts/verify-visuals.cjs` checks browser interactions, persistent scene geometry, and device presentation with synthetic inputs. It requires a local Playwright installation and Chromium; set `IO_PLAYWRIGHT_PATH` to the Playwright module and `IO_BASE_URL` to the running app. `IO_VERIFY_OUTPUT` selects the capture directory (default: ignored `artifacts/visuals`). These checks do not certify physical hardware, other browsers, assistive technology, or GPU performance.
