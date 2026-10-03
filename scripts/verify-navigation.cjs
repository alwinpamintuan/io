// Requires a build and local Playwright/Chromium. The server has no SPA fallback.
const assert = require('node:assert/strict');
const { startStaticServer, launchBrowser } = require('./static-browser.cjs');
const routes = [
  ['', null], ['keyboard-test', 'keyboard'], ['mouse-test', 'mouse'], ['controller-test', 'controller'],
  ['webcam-test', 'camera'], ['microphone-test', 'microphone'], ['speaker-test', 'audio'],
  ['monitor-test', 'monitor'], ['refresh-rate-test', 'monitor'],
];
const ready = (page, device) => page.waitForFunction(device => document.querySelector('#status').textContent === (device ? device + ' ready.' : 'Choose a device to test.'), device);

(async () => {
  const server = await startStaticServer(); let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.captureRequests = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { window.captureRequests++; throw new Error('Unexpected permission request'); };
    });
    for (const [slug, device] of routes) {
      const route = slug ? slug + '/' : '';
      const response = await page.goto(server.url + '/io/' + route);
      assert.equal(response.status(), 200); await ready(page, device);
      assert.equal(await page.locator('.site-info').getAttribute('open'), null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), 900);
      assert.equal(await page.evaluate(() => window.captureRequests), 0);
      if (slug === 'refresh-rate-test') assert.equal(await page.getByRole('button', { name: 'timing pattern', exact: true }).getAttribute('aria-pressed'), 'true');
    }
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(server.url + '/io/');
    await nojs.locator('.site-info summary').focus(); await nojs.keyboard.press('Enter');
    assert.equal(await nojs.locator('.site-info').getAttribute('open'), '');
    await nojs.locator('.test-guide').getByRole('link', { name: 'Mouse Tester', exact: true }).click();
    assert.ok(nojs.url().endsWith('/io/mouse-test/'));
    assert.equal(await nojs.locator('.site-info').getAttribute('open'), null);
    await nojs.close();
    await page.goto(server.url + '/io/keyboard-test/'); await ready(page, 'keyboard');
    await page.evaluate(() => { window.originalCanvas = document.querySelector('#scene'); window.sessionToken = 'same app'; });
    await page.keyboard.press('a');
    await page.waitForFunction(() => document.querySelector('.measurements').textContent.includes('1 detected'));
    await page.locator('.site-info summary').click();
    await page.locator('.test-guide').getByRole('link', { name: 'Mouse Tester', exact: true }).click(); await ready(page, 'mouse');
    assert.equal(await page.evaluate(() => document.querySelector('#scene') === window.originalCanvas && window.sessionToken === 'same app'), true);
    await page.goBack(); await ready(page, 'keyboard');
    await page.waitForFunction(() => document.querySelector('.measurements').textContent.includes('1 detected'));
    await page.goForward(); await ready(page, 'mouse');
    await page.locator('.overview-link').click(); await ready(page, null); assert.ok(page.url().endsWith('/io/'));
    await page.goto(server.url + '/io/#camera'); await ready(page, 'camera'); assert.ok(page.url().endsWith('/io/webcam-test/'));
    await page.goto(server.url + '/io/#unknown'); await ready(page, null); assert.ok(page.url().endsWith('/io/'));
    await page.goto(server.url + '/io/refresh-rate-test/'); await ready(page, 'monitor');
    await page.locator('.site-info summary').click(); await page.locator('.test-guide').getByRole('link', { name: 'Monitor Test', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'white pattern', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.goBack();
    assert.equal(await page.getByRole('button', { name: 'timing pattern', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.site-info summary').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), 844);
    const box = await page.locator('.test-guide').boundingBox(); assert.ok(box.y + box.height <= 844);
    await page.locator('.test-guide').getByRole('link', { name: 'Microphone Test', exact: true }).click(); await ready(page, 'microphone');
    assert.equal(await page.locator('.site-info').getAttribute('open'), null);
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : getContext.call(this, type, ...args); };
    });
    await fallback.goto(server.url + '/io/refresh-rate-test/');
    await fallback.getByRole('button', { name: 'timing pattern', exact: true }).waitFor();
    assert.equal(await fallback.getByRole('button', { name: 'timing pattern', exact: true }).getAttribute('aria-pressed'), 'true');
    await fallback.locator('.overview-link').click();
    assert.ok(fallback.url().endsWith('/io/'));
    await fallback.close();
    await page.goto(server.url + '/io/keyboard-test/?utm_source=search'); await ready(page, 'keyboard');
    await page.evaluate(() => { window.sessionToken = 'query session'; });
    await page.keyboard.press('b');
    await page.locator('.site-info summary').click();
    await page.locator('.test-guide').getByRole('link', { name: 'Mouse Tester', exact: true }).click(); await ready(page, 'mouse');
    assert.ok(page.url().endsWith('/io/mouse-test/?utm_source=search'));
    assert.equal(await page.evaluate(() => window.sessionToken), 'query session');
    await page.locator('.overview-link').click(); await ready(page, null);
    assert.ok(page.url().endsWith('/io/?utm_source=search'));
    assert.equal(await page.evaluate(() => window.sessionToken), 'query session');
    for (const [slug] of routes) assert.equal((await page.request.get(server.url + '/' + (slug ? slug + '/' : ''))).status(), 200);
    await page.goto(server.url + '/refresh-rate-test/'); await ready(page, 'monitor');
    await page.locator('.overview-link').click(); await ready(page, null); assert.equal(page.url(), server.url + '/');
    assert.deepEqual(errors, []);
    console.log('Navigation browser checks passed: direct tester entry, history, legacy links, session continuity, query preservation, timing mode, mobile Info, permissions and WebGL fallback.');
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
