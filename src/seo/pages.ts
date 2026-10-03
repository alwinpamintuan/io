import type { DeviceId } from '../app/state.ts';

export const SITE_URL = 'https://alwinpamintuan.github.io/io/';
export const SOCIAL_IMAGE = `${SITE_URL}social-preview.png`;

export interface SeoPage {
  slug: string;
  device: DeviceId | null;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: { heading: string; text: string }[];
}

export const SEO_PAGES: readonly SeoPage[] = [
  {
    slug: '', device: null,
    title: 'IO — Minimal Online Peripheral Tester', h1: 'Online Peripheral Tester',
    description: 'Test keyboards, mice, controllers, webcams, microphones, speakers and monitors with IO, a minimal browser-based peripheral tester with no uploads.',
    intro: 'IO is a free browser-based space for checking PC peripherals. Choose a device in the illustrated workstation to open its test, or follow a test link below. One shared workstation holds the keyboard, mouse, monitor, webcam, controller, speakers and microphone. The overview arrow returns you to the desk without restarting the application.',
    sections: [
      { heading: 'Choose a device test', text: 'Check keyboard keys and combinations, inspect mouse buttons and scrolling, or view controller buttons and stick axes. Camera and microphone tests show local input after you select Start. Speaker tests play short tones through selected output channels. Monitor patterns support visual inspection of pixels, gradients and geometry. The refresh-rate test estimates browser repaint cadence using the same monitor tester.' },
      { heading: 'What IO observes', text: 'IO uses browser input events, media-track settings and Gamepad API snapshots. These observations help you compare expected actions with what reaches the page. They do not diagnose every hardware fault. Mouse event frequency is browser delivery, microphone amplitude is a digital signal level, and repaint cadence is a browser/display-pipeline estimate rather than direct panel telemetry.' },
      { heading: 'Privacy and access', text: 'Device observations stay in page memory. There are no analytics, uploads, recordings or persistent diagnostic history. Webcam and microphone permission starts only from an explicit Start control; Stop, leaving a test or backgrounding the page releases capture. JavaScript is needed for testing, and available features depend on the browser and connected devices. Keyboard navigation, reduced motion and a WebGL-free fallback keep the controls usable in different environments.' },
    ],
  },
  {
    slug: 'keyboard-test', device: 'keyboard',
    title: 'Keyboard Tester — Keys, Combinations & Repeat Online | IO', h1: 'Keyboard Tester',
    description: 'Test keyboard keys, held combinations, tested-key progress and repeat timing online. Inspect browser-reported input with IO’s local keyboard tester.',
    intro: 'Use the keyboard tester to check which keys reach your browser, see held combinations, and inspect key-repeat timing. The workstation opens in keyboard focus. Press a key on your physical keyboard and compare the highlighted key with the input you intended. The illustrated keyboard uses a 104-key ANSI layout; your physical layout may differ.',
    sections: [
      { heading: 'Keys, combinations and repeat', text: 'IO distinguishes keys held now from keys tested during this page session. Hold several keys together to inspect the combination received by the browser. Hold a single key to observe hold duration and repeating input. Reset clears tested-key progress when you want to begin again. Returning to overview or switching devices preserves tested-key progress within the same running page.' },
      { heading: 'Ghosting and rollover checks', text: 'If you are investigating keyboard ghosting or key rollover, try the specific combinations you use and watch which events arrive. An absent event can have several causes, including the keyboard, operating system or browser. This test does not certify an NKRO specification or directly inspect keyboard firmware. Physical key codes are preferred, with character and location fallbacks when necessary.' },
      { heading: 'Browser limitations and privacy', text: 'Browser and operating-system shortcuts may be intercepted before IO receives them. Escape remains testable input rather than returning home; use the overview arrow to leave. Click or focus the test surface before testing after using other controls. Key observations stay in page memory without recording or uploading your typing. Use the related mouse or controller tests to inspect other input devices separately.' },
    ],
  },
  {
    slug: 'mouse-test', device: 'mouse',
    title: 'Mouse Tester — Buttons, Click Intervals & Event Rate | IO', h1: 'Mouse Tester',
    description: 'Test mouse buttons, wheel scrolling, movement and click intervals. View estimated browser event rate without claiming hardware USB polling-rate telemetry.',
    intro: 'Use the mouse tester to verify button input, scrolling, click intervals and browser-delivered pointer event frequency. The workstation opens in mouse focus. Move the pointer over the test surface, press and release buttons, and scroll the wheel to compare the displayed observations with your actions. Short movement trails help show the input received by the page.',
    sections: [
      { heading: 'Buttons, wheel and double-click checks', text: 'Inspect button states as you press and release them, then check wheel direction and accumulated scrolling. Click intervals show the time between delivered clicks. When investigating an unexpected double click, make deliberate single clicks and look for unexpectedly short intervals. IO displays events and intervals; it does not automatically classify a switch as faulty or replace your operating system’s double-click setting.' },
      { heading: 'Estimated browser event rate', text: 'Move the mouse steadily to inspect the rolling event-frequency estimate. Coalesced pointer events are used when the browser exposes them. Scheduling, event coalescing, display timing, page load and browser policy all affect delivery. The number is not a guaranteed USB polling rate and cannot independently validate a manufacturer’s hardware specification. Compare observations under similar conditions rather than treating a single sample as a hardware verdict.' },
      { heading: 'Browser limitations and privacy', text: 'The test observes events delivered to its surface. Pointer movement outside that area or actions captured by browser controls may not appear in the same way. Touchpads can produce different scrolling behavior from physical wheels. All observations stay in page memory, with no analytics or uploads. Use the keyboard and controller tests for separate checks of key and gamepad input.' },
    ],
  },
  {
    slug: 'controller-test', device: 'controller',
    title: 'Controller Tester — Gamepad Buttons, Sticks & Drift Checks | IO', h1: 'Controller Tester',
    description: 'Inspect controller buttons, triggers and analog stick axes with IO. Check browser Gamepad API state and resting stick behavior without calibrated drift claims.',
    intro: 'Use the controller tester to inspect gamepad buttons, triggers and analog stick axes reported by your browser. Connect a controller and press a button if the browser needs an interaction before exposing it. Select the connected controller you want to inspect. The workstation opens the controller view while keeping the same shared scene and navigation.',
    sections: [
      { heading: 'Buttons, triggers and stick axes', text: 'Press buttons individually and move each stick through its range. IO presents standard physical controls for standard mappings, including raw axis values and vector scopes. Analog trigger values depend on what the browser and controller expose. Neutral, Xbox and PlayStation legends change presentation only; they do not remap physical inputs. Unknown mappings use indexed buttons and axes rather than implying a standard layout.' },
      { heading: 'Inspect resting stick behavior', text: 'For a stick-drift check, release the sticks and observe whether reported axes remain displaced or fluctuate. Compare both sticks and repeat after moving them in several directions. The reference rings provide visual context, not measured hardware dead zones. Browser state can reflect controller firmware, drivers and operating-system processing, so a resting value alone does not identify the cause or certify a calibration.' },
      { heading: 'Support and privacy', text: 'Gamepad API support and controller mapping vary between browsers and devices. Optional haptics appear only when supported. If a controller is absent, check its connection and try a button press before drawing conclusions. IO keeps these observations in page memory without uploads or stored profiles. Use the keyboard and mouse tests to inspect other input devices, or return to overview with the arrow.' },
    ],
  },
  {
    slug: 'webcam-test', device: 'camera',
    title: 'Webcam Test — Local Preview, Resolution & Track FPS | IO', h1: 'Webcam Test',
    description: 'Preview your webcam locally and inspect reported resolution and frame-rate settings. IO requests camera permission only when you select Start.',
    intro: 'Use the webcam test to check a local camera preview and inspect the settings reported by the active video track. Opening this page focuses the webcam but does not start capture. Select Start when you are ready, then allow camera access in the browser. The preview appears in an adjacent viewing frame while the camera remains mounted on the workstation monitor.',
    sections: [
      { heading: 'Preview and track settings', text: 'Compare the picture with the scene in front of your camera, and choose whether to mirror the preview. The image is fitted within its viewing frame without changing the captured aspect ratio. When available, IO displays active media-track settings such as resolution and frame rate. Reported FPS is a track setting, not an independently measured count of every delivered frame or a benchmark of camera performance.' },
      { heading: 'Camera selection and access', text: 'Available input choices depend on what the browser exposes after permission. If access fails, check the browser permission, the selected camera and whether another application is using it. Camera access needs a secure connection such as HTTPS or localhost. An embedded page may also need permission from its host. A successful preview confirms that video reaches the page; it does not certify sensor quality or color accuracy.' },
      { heading: 'Local capture and stopping', text: 'The webcam preview stays in your browser. IO does not upload, record or persist camera observations. Stop releases capture, as do leaving the webcam test and backgrounding the page. Canceled permission requests cannot reactivate capture later. Use the separate microphone test to inspect audio input; opening the camera test does not start microphone capture. The overview arrow returns you to the same workstation.' },
    ],
  },
  {
    slug: 'microphone-test', device: 'microphone',
    title: 'Microphone Test — Input Level & Waveform Online | IO', h1: 'Microphone Test',
    description: 'Check microphone input with a local waveform and digital RMS level. Start capture explicitly; audio is never recorded, uploaded or fed into speakers.',
    intro: 'Use the microphone test to inspect incoming audio as a local waveform and digital RMS amplitude. Opening the page focuses the microphone without requesting permission. Select Start to begin and allow microphone access when the browser asks. Speak at an ordinary level and watch whether the waveform and level respond to your voice or other nearby sound.',
    sections: [
      { heading: 'Waveform and digital input level', text: 'The waveform shows changes in the captured digital signal. RMS summarizes digital amplitude, helping you see whether input is quiet, active or changing. It is not calibrated sound pressure, a decibel sound-level meter or a direct measurement of microphone sensitivity. Browser audio processing, input gain and device settings can affect the signal before IO observes it. Compare the display with what you expect from the selected source.' },
      { heading: 'Selecting and troubleshooting input', text: 'Available microphone choices depend on browser access and connected hardware. If there is no response, check the chosen device, browser permission and system input settings. Capture requires HTTPS or localhost; an embedded page may need additional permission from its host. A responding waveform confirms input reaches the page, but does not certify recording quality, noise performance or the absence of every hardware issue.' },
      { heading: 'Privacy and safe separation', text: 'IO never routes microphone input to its speaker output test. Audio is not recorded, uploaded or stored as diagnostic history. Stop, leaving the microphone view and backgrounding the page release capture. A canceled asynchronous request cannot start the microphone later. Use the separate speaker test to check output channels and the webcam test to inspect camera input; each has its own explicit controls.' },
    ],
  },
  {
    slug: 'speaker-test', device: 'audio',
    title: 'Speaker Test — Left, Right & Stereo Audio Test | IO', h1: 'Speaker Test',
    description: 'Play short left, right or stereo test tones to check speaker and headphone output channels. Use explicit playback controls and conservative tones with IO.',
    intro: 'Use the speaker test to listen for left, right and stereo output through your speakers or headphones. This page opens the workstation’s audio output tester. Start with a comfortable system volume, then select the channel and tone you want to hear. Playback begins only from an explicit control; simply opening the page does not play sound.',
    sections: [
      { heading: 'Left, right and stereo tones', text: 'IO offers short one-second tones at 220, 440 and 880 Hz through the left channel, right channel or both. Compare the output you hear with the channel you selected. The display and restrained wavefront graphics indicate initiated playback and channel selection. They do not measure whether sound physically reached a speaker. A Stop control ends output when you need to interrupt a test.' },
      { heading: 'What listening can tell you', text: 'Separate channel tones can help you notice a missing channel, unexpected routing or a left/right mismatch. Headphones, Bluetooth devices, mono accessibility settings and system audio processing can change what you hear. Check system output selection and volume if playback seems absent. IO does not measure frequency response, distortion, loudness or speaker quality, and the tones are not a calibrated acoustic test.' },
      { heading: 'Browser behavior and privacy', text: 'Browser audio policies may require a user interaction before sound is allowed. Leaving the audio test, backgrounding the page or selecting Stop releases output. The microphone is tested separately and is never fed through the speakers, avoiding an input-monitoring feedback path. There are no recordings or uploads. Use the microphone test for input observations, or return to overview to inspect another device.' },
    ],
  },
  {
    slug: 'monitor-test', device: 'monitor',
    title: 'Monitor Test — Pixels, Grid, Gradients & Motion | IO', h1: 'Monitor Test',
    description: 'Inspect your screen with color fills, gradients, grids and motion patterns. IO provides 16 monitor patterns and fullscreen controls for visual checks.',
    intro: 'Use the monitor test to visually inspect your display with solid colors, gradients, grids and motion patterns. The page opens monitor focus with a white inspection surface. Choose a pattern using the controls and enter fullscreen when you want a larger view. The same monitor remains part of the workstation; the overview arrow returns you to the desk.',
    sections: [
      { heading: 'Pixels, steps and geometry', text: 'IO includes 16 patterns: white, black, gray, red, green, blue, gradient, near-black, near-white, color ramps, grid, checkerboard, horizontal lines, vertical lines, motion and timing. Solid colors can help you look for pixels that stand out. Near-black and near-white steps support a visual check of tonal separation. The grid and circle help inspect geometry and aspect ratio. These patterns support observation rather than automatically detecting dead pixels.' },
      { heading: 'Motion and fullscreen inspection', text: 'The motion pattern provides adjustable movement speed and direction with pause controls. Fullscreen keeps the pattern and controls available together. Browser zoom, display scaling and the rendered surface size affect fine alternating-pixel patterns, so inspect them with that context. Apparent trails or softness can involve the browser, graphics pipeline and panel; IO does not directly measure panel response time or certify a display’s specifications.' },
      { heading: 'Timing and limitations', text: 'For an estimate of browser repaint frequency and frame time, use the related refresh-rate test. It opens the same monitor in timing mode. Browser timing is not guaranteed hardware refresh rate. IO does not upload observations or store inspection history. Lighting, display settings and your viewing position can affect visual judgments; compare patterns under consistent conditions before drawing conclusions.' },
    ],
  },
  {
    slug: 'refresh-rate-test', device: 'monitor',
    title: 'Refresh Rate Test — Browser Hz & Frame-Time Estimate | IO', h1: 'Refresh Rate Test',
    description: 'Estimate browser repaint Hz and frame time with IO’s monitor timing view. Results reflect browser/display-pipeline cadence, not direct hardware telemetry.',
    intro: 'Use the refresh-rate test to estimate repaint cadence and frame time in the browser. This page opens the shared monitor tester in timing mode. Keep the page visible and allow a short sampling period before comparing readings. The number describes the timing observed by this page; it is not a direct readout of the monitor’s hardware refresh-rate setting.',
    sections: [
      { heading: 'What the estimate measures', text: 'IO uses the shared application frame clock to observe the intervals between browser frames. Repaint frequency and frame-time observations summarize that delivery cadence. They can help you compare how the page behaves on different displays or under different conditions. A nominal 60, 120 or 144 Hz panel does not guarantee the browser will deliver exactly that cadence on every frame or in every configuration.' },
      { heading: 'Conditions that affect browser Hz', text: 'Operating-system display settings, variable refresh, browser scheduling, graphics load, power saving and multiple monitors can influence results. Background tabs may be throttled, so use an active visible page. Repeat comparisons under similar conditions rather than treating one reading as a hardware verdict. Browser timing cannot independently measure panel response time, identify every dropped display frame or verify a manufacturer’s advertised refresh specification.' },
      { heading: 'Related monitor checks', text: 'Switch to the monitor test for color fills, gradients, pixel patterns and geometry inspection. Its motion controls provide a visual comparison with adjustable speed and direction. Both pages share one monitor, scene and render loop; moving between them changes the entry pattern without creating another tester. IO stores timing observations only in page memory and does not upload them. Use the overview arrow to return to the workstation and select another device.' },
    ],
  },
];

export const HOME_PAGE = SEO_PAGES[0]!;
export function pageForDevice(device: DeviceId | null): SeoPage {
  return SEO_PAGES.find(page => page.device === device) ?? HOME_PAGE;
}
export function canonicalUrl(page: SeoPage): string {
  return `${SITE_URL}${page.slug ? `${page.slug}/` : ''}`;
}
