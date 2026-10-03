// Capture the actual workstation artwork; run after npm run build with local Playwright/Chromium.
const path = require('node:path');
const { startStaticServer, launchBrowser } = require('./static-browser.cjs');
(async () => {
  const server = await startStaticServer();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(server.url + '/');
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Choose a device to test.');
    await page.addStyleTag({ content: '.site-info, #view-label, .device-navigation { display: none; }' });
    await page.evaluate(() => {
      const label = document.createElement('p'); label.textContent = 'Peripheral Tester';
      label.style.cssText = 'position:absolute;left:28px;bottom:18px;margin:0;font-size:13px;color:#5d5d58';
      document.querySelector('#app').append(label);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.resolve(__dirname, '../public/social-preview.png') });
    console.log('Created public/social-preview.png (1200 × 630) from the IO workstation.');
  } finally { if (browser) await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
