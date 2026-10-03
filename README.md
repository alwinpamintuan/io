# IO — A space for your devices

A static, client-side peripheral tester built with TypeScript and Three.js. Seven persistent devices share one desk, world, camera, and render loop. Select a device to test it; the arrow beside the IO mark and current-view label returns to the workstation.

Live site: [alwinpamintuan.github.io/io](https://alwinpamintuan.github.io/io/). GitHub Actions deploys each push to `main` to GitHub Pages.

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

Deploy the complete contents of `dist/` to a static HTTPS host. The build generates real route directories with shared relative asset URLs, so no server route rewrites, backend, database, or API keys are needed. Camera and microphone access require a secure context; localhost is suitable for development. Open the site as HTTP(S), rather than opening the HTML file directly. Hosting inside an iframe may require camera, microphone, fullscreen, and gamepad permission policies from the embedding page.

## Testers

- **Keyboard:** a full 104-key ANSI model, independent held/tested states, key combinations, last key, hold/repeat timing, and Reset. Physical `code` is preferred, with character/location fallback. Browser and OS shortcuts remain reserved.
- **Mouse:** button states, wheel direction/accumulation, click intervals, short movement trails, and a rolling estimate of browser-delivered event frequency. Coalesced events are used when available; this is not hardware polling-rate telemetry.
- **Monitor:** 16 inspection patterns, including near-black/white steps, color ramps, grid/circle, alternating pixels, adjustable motion, and repaint cadence. A glyph rail and motion controls remain available in fullscreen. Repaint cadence is a browser estimate, not measured panel response time or a guaranteed hardware refresh rate.
- **Webcam:** explicit Start/Stop, an adjacent local viewing frame connected to the mounted camera, contain-fit video, mirror preference, reported track settings, and normalized permission/device errors.
- **Controller:** connection/selection, standard physical button/stick mapping, Neutral/Xbox/PlayStation display legends, raw axes and vector scopes with radial ticks and neutral reference rings, generic indexed mapping, and optional feature-detected haptics. Reference rings do not measure hardware dead zones. Display styles do not change mapping.
- **Audio:** conservative one-second 220/440/880 Hz left/right/both output tones and Stop, with outward channel-gated wavefronts and L/R/LR playback status. Reduced motion shows static channel arcs during playback. These graphics indicate initiated playback, not measured sound.
- **Microphone:** independent Start/Stop, local waveform and digital RMS amplitude. Input is never played through speakers. Digital amplitude is not calibrated sound pressure.

Public routes are `keyboard-test/`, `mouse-test/`, `controller-test/`, `webcam-test/`, `microphone-test/`, `speaker-test/`, `monitor-test/` and `refresh-rate-test/`, relative to the deployment root (`/io/` on GitHub Pages). Each opens the corresponding device; refresh-rate testing opens the monitor's timing pattern. The overview arrow returns to the root. In-app navigation and Back/Forward keep one shared scene and page-session key progress. Direct loads and reloads use the generated route files.

Legacy hashes `#keyboard`, `#mouse`, `#monitor`, `#camera`, `#controller`, `#audio`, and `#microphone` still work and normalize to real paths without adding a history entry. Unknown hashes show overview. Deep links and Back/Forward work during transitions. Keyboard users can Tab to semantic device buttons; narrow viewports expose the buttons visibly. Reduced motion uses a short controlled camera cut. If WebGL2 initialization fails, the same adapters remain available through semantic controls and a 2D test surface.

### Device selection across viewport sizes

In the 3D overview, viewports wider than 700 CSS pixels use the illustrated devices as pointer targets. Hovering a device reveals its name, leader, and technical field; clicking the device or revealed label enters the same tester. Tab focus reveals the same annotation with a visible focus indicator through semantic device buttons. Touch selection activates directly. At 700 CSS pixels or less, all device buttons are visible in overview to make selection easier on small screens. This is a responsive layout rule; no browser accessibility option is required. The WebGL-free fallback always exposes its device navigation.

## Privacy and lifecycle

IO has no analytics, upload, recording, persistent diagnostic storage, or external runtime assets. Device observations stay in memory on the page. Camera/microphone permission is requested only by the corresponding Start button; selecting a device does not prompt. Stop, leaving focus, backgrounding the page, or shutdown stops media tracks and audio. Stale asynchronous requests cannot reactivate devices after cancellation. Browser permission preferences are managed by the browser.

See [IO principles](docs/IO_Principles.md) for product, engineering, and design guidance.

## Search and sharing

The homepage and eight tester pages have unique titles, descriptions, self-referencing canonicals, WebApplication structured data and social metadata. Their initial HTML includes route-specific explanations, measurement limitations and normal links to related tests inside the collapsed Info section in the upper-right corner. Info opens a scrollable guide without extending the workstation page. Selecting a related test closes Info and navigates within the same application. Modified clicks retain native link behavior. The disclosure and page links work without JavaScript; interactive testing requires JavaScript.

`src/seo/pages.ts` is the source of truth for routes, copy and production URLs. The Vite SEO plugin generates the nine HTML entry files, `sitemap.xml` and `robots.txt` during the build. Assets remain shared, and nested pages use relative paths to those assets. `public/social-preview.png` is a 1200 × 630 capture of the workstation; regenerate it with `node scripts/create-social-preview.cjs` after a build, then build again to include the new image.

The sitemap is published at `https://alwinpamintuan.github.io/io/sitemap.xml` and lists all nine pages without hash fragments. The generated robots file allows crawling and references that sitemap. GitHub Pages serves this project under `/io/`, but search engines read robots rules only at the host root `/robots.txt`. Publish the generated rules in the `alwinpamintuan.github.io` root repository, or at the root of a future custom domain, for them to apply.

After deployment, verify the `/io/` URL-prefix property in Google Search Console, submit the sitemap, inspect each entry page and request indexing where appropriate. Search Console ownership and indexing requests are account-level operations; a sitemap does not guarantee immediate indexing. Repository About should describe IO as a minimal browser-based keyboard, mouse, controller, webcam, display, speaker and microphone tester, link to the live site, and include relevant device-testing topics.

For local navigation verification, run `npm run build` and `npm run verify:navigation`. The browser check uses a strict static server without an SPA fallback, testing direct tester entry, history, legacy links, page-session continuity, permissions, monitor timing, mobile Info and WebGL fallback under both `/` and GitHub Pages-style `/io/` paths. It requires local Playwright and Chromium, like the existing device verification scripts. Override discovery with `IO_PLAYWRIGHT_PATH` (package path) and `IO_CHROMIUM_PATH` (browser executable) if needed.

When moving to another production address, change `SITE_URL` in `src/seo/pages.ts` and rebuild; canonicals, JSON-LD, Open Graph URLs, social image URLs, sitemap and robots output update together. Preserve the tester route structure and update Search Console and repository About to match.
