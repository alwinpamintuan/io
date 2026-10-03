const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

async function startStaticServer() {
  const root = path.resolve(__dirname, '../dist');
  const server = http.createServer((request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.startsWith('/io/')) pathname = pathname.slice(3);
      let file = path.resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.png': 'image/png' };
      response.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

async function launchBrowser() {
  const runtime = process.env.IO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const { chromium } = require(runtime);
  if (process.env.IO_CHROMIUM_PATH) return chromium.launch({ headless: true, executablePath: process.env.IO_CHROMIUM_PATH });
  const directory = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  const installed = fs.readdirSync(directory).filter(name => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0];
  return chromium.launch({ headless: true, executablePath: path.join(directory, installed, 'chrome-win64/chrome.exe') });
}
module.exports = { startStaticServer, launchBrowser };
