// Requires local Playwright/Chromium and a running dev server. Synthetic inputs only.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const runtime = process.env.IO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const browserRoot = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const installed = fs.readdirSync(browserRoot).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0];
const base = process.env.IO_BASE_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path.join(browserRoot, installed, 'chrome-win64/chrome.exe') });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.deviceFixture = { pad: null, mediaCalls: 0, tracks: [], deny: false };
      Object.defineProperty(navigator, 'getGamepads', { value: () => deviceFixture.pad ? [deviceFixture.pad] : [] });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
        deviceFixture.mediaCalls++;
        if (deviceFixture.deny) throw new DOMException('Fixture denial', 'NotAllowedError');
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(30);
        deviceFixture.tracks.push(...stream.getTracks());
        return stream;
      } });
    });
    const until = async (predicate, message) => {
      const deadline = Date.now() + 5000;
      while (!await predicate()) {
        assert.ok(Date.now() < deadline, message);
        await page.waitForTimeout(50);
      }
    };
    const text = (locator, value, exact = false) => until(async () => {
      const actual = await locator.textContent();
      return exact ? actual === value : actual.includes(value);
    }, 'Expected text: ' + value);
    const enabled = (locator, expected) => until(async () => await locator.isEnabled() === expected, 'Expected enabled: ' + expected);
    const route = async id => {
      await page.evaluate(id => location.hash = id || '', id);
      await text(page.locator('#status'), id ? `${id} ready.` : 'Choose a device to test.', true);
    };
    const metrics = page.locator('.measurements');
    await page.goto(`${base}/#keyboard`);
    await text(page.locator('#status'), 'keyboard ready.', true);
    await page.locator('#scene').focus();
    await page.keyboard.press('a');
    await text(metrics, 'KeyA');
    await page.keyboard.press('Escape');
    await text(page.locator('#view-label'), 'keyboard', true);
    await route('mouse');
    await page.locator('#scene').dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0, buttons: 1 });
    await text(metrics, 'Left down');
    await page.locator('#scene').dispatchEvent('pointerup', { pointerType: 'mouse', button: 0, buttons: 0 });
    await text(metrics, 'Left up');
    await route('keyboard');
    await text(metrics, '2 detected');
    await page.getByRole('button', { name: 'Reset keyboard test', exact: true }).click();
    await text(metrics, '0 detected');

    await route('monitor');
    const pattern = name => page.getByRole('button', { name: `${name} pattern`, exact: true });
    assert.equal(await pattern('white').getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Next pattern', exact: true }).click();
    assert.equal(await pattern('black').getAttribute('aria-pressed'), 'true');
    await pattern('motion').click();
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Resume motion', exact: true }).getAttribute('aria-pressed'), 'true');

    await route('controller');
    await text(metrics, 'Not yet detected', true);
    await page.evaluate(() => deviceFixture.pad = { id: 'Fixture', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [.001, -.003, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ value: i === 0 ? .42 : 0, pressed: false })) });
    await text(metrics, 'A0 0.001  A1 -0.003');
    await text(metrics, 'B0 0.42');
    await page.getByRole('combobox', { name: 'Controller legend style', exact: true }).click();
    await page.getByRole('option', { name: 'Xbox', exact: true }).click();
    await text(metrics, 'A0 0.001  A1 -0.003');
    await page.evaluate(() => deviceFixture.pad.mapping = '');
    await text(page.locator('.instrument'), 'Generic indexed mapping');
    await page.evaluate(() => deviceFixture.pad = null);
    await text(metrics, 'Previously exposed controller disconnected', true);

    await route('audio');
    for (const [channel, label] of [['left', 'L'], ['right', 'R'], ['both', 'LR']]) {
      await page.getByRole('button', { name: `Play one-second ${channel} channel tone`, exact: true }).click();
      await text(metrics, `${label} · Playback initiated`, true);
      await page.getByRole('button', { name: 'Stop tone', exact: true }).click();
      await text(metrics, 'Ready to test output', true);
    }
    await page.getByRole('button', { name: 'Play one-second both channel tone', exact: true }).click();
    await text(metrics, 'Playback initiated');
    await text(metrics, 'Ready to test output', true);

    await route('camera');
    assert.equal(await page.evaluate(() => deviceFixture.mediaCalls), 0, 'Selection does not request media');
    const start = page.getByRole('button', { name: 'Start camera', exact: true });
    await start.click();
    await enabled(start, false);
    await page.locator('.camera-preview video').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.camera-preview video').videoWidth === 640);
    await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
    await enabled(start, true);
    assert.equal(await page.evaluate(() => deviceFixture.tracks.every(t => t.readyState === 'ended')), true, 'Stop releases camera tracks');
    await start.click();
    await enabled(start, false);
    await page.waitForFunction(() => document.querySelector('.camera-preview video').videoWidth === 640);
    await page.getByRole('link', { name: 'Return to workstation overview', exact: true }).click();
    await text(page.locator('#status'), 'Choose a device to test.', true);
    assert.equal(await page.evaluate(() => deviceFixture.tracks.every(t => t.readyState === 'ended')), true, 'Leaving focus releases camera tracks');
    await route('microphone');
    assert.equal(await page.evaluate(() => deviceFixture.mediaCalls), 2, 'Microphone selection does not request media');
    await page.evaluate(() => deviceFixture.deny = true);
    await page.getByRole('button', { name: 'Start microphone', exact: true }).click();
    await text(page.locator('.instrument'), 'Access was denied');
    await enabled(page.getByRole('button', { name: 'Start microphone', exact: true }), true);

    // The accessible fallback must expose usable testers, without scene inspection hooks.
    await page.goto(`${base}/?debugFallback`);
    await page.getByRole('button', { name: 'Test keyboard', exact: true }).click();
    await page.locator('#scene').focus();
    await page.keyboard.press('s');
    await text(metrics, 'KeyS');
    await page.getByRole('link', { name: 'Return to workstation overview', exact: true }).click();
    await text(page.locator('#view-label'), 'overview', true);
    assert.deepEqual(errors, [], 'No browser page errors');
    console.log('Verified device controls, observations, media lifecycle, navigation, and fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
