// Render verification and screenshot capture for Hushline.
// Starts the static server, drives the game in headless Chrome from ?shot=N poses,
// checks every page for errors and off-host requests, then writes the four real renders.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('..', import.meta.url));
const shotDir = join(root, 'screenshots');
const port = 8237;
const base = `http://127.0.0.1:${port}`;
const named = '/workspace/.cache/puppeteer/chrome-headless-shell/linux-127.0.6533.88/chrome-headless-shell-linux64/chrome-headless-shell';

function findShell() {
  if (existsSync(named)) return named;
  const parent = '/workspace/.cache/puppeteer/chrome-headless-shell';
  const versions = readdirSync(parent).filter((name) => name.startsWith('linux-')).sort().reverse();
  for (const version of versions) {
    const candidate = join(parent, version, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('no chrome-headless-shell found');
}

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('not a JPEG');
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) { at++; continue; }
    const marker = bytes[at + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error('no JPEG frame found');
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const reply = await fetch(`${base}/index.html`);
      if (reply.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error('static server did not start');
}

const errors = [];
const external = [];
const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
try {
  await waitForServer();
  const executablePath = findShell();
  console.log(`headless shell: ${executablePath}`);
  browser = await puppeteer.launch({
    executablePath,
    headless: 'shell',
    env: { ...process.env, LD_LIBRARY_PATH: '/workspace/chrome-libs:/workspace/chrome-libs/gbm' },
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(`pageerror at ${page.url()}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console at ${page.url()}: ${message.text()}`);
  });
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()}`));
  page.on('request', (request) => {
    if (!request.url().startsWith(base) && !request.url().startsWith('data:')) external.push(request.url());
  });

  async function inspect(url, ready) {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(ready, { timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 180));
    return page.evaluate(() => {
      const canvas = document.getElementById('stage');
      const ctx = canvas.getContext('2d');
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const seen = new Set();
      let lit = 0;
      for (let i = 0; i < data.length; i += 4 * 97) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        seen.add(key);
        if (data[i] + data[i + 1] + data[i + 2] > 90) lit++;
      }
      return {
        size: `${canvas.width}x${canvas.height}`,
        colors: seen.size,
        lit,
        phase: window.__hushline.phase,
        level: window.__hushline.level.index,
        frozen: window.__hushline.frozen,
      };
    });
  }

  const play = await inspect(`${base}/index.html`, 'window.__hushline && window.__hushline.frozen === false');
  console.log(`playable page: ${play.size}, ${play.colors} sampled colors, phase=${play.phase}, level=${play.level}`);
  if (play.colors < 40 || play.lit < 100) throw new Error('playable page rendered a blank canvas');

  const plan = [
    ['01-glasshouse-cover.jpg', 1],
    ['02-lantern-yard.jpg', 2],
    ['03-near-miss.jpg', 3],
    ['04-route-clear.jpg', 4],
  ];
  for (const [name, shot] of plan) {
    const info = await inspect(`${base}/index.html?shot=${shot}`, 'window.__hushline && window.__hushline.frozen === true');
    if (info.colors < 40 || info.lit < 100) throw new Error(`shot ${shot} rendered a blank canvas`);
    const path = join(shotDir, name);
    let quality = 84;
    let bytes;
    while (quality >= 50) {
      await page.screenshot({ path, type: 'jpeg', quality });
      bytes = readFileSync(path);
      if (bytes.length <= 262144) break;
      quality -= 8;
    }
    const { width, height } = jpegDimensions(bytes);
    if (bytes.length > 262144 || Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      throw new Error(`${name} outside screenshot caps`);
    }
    console.log(`${name}: shot=${shot}, ${bytes.length} bytes, ${width}x${height}, q=${quality}, phase=${info.phase}, level=${info.level}, colors=${info.colors}`);
  }

  if (external.length) throw new Error(`external requests: ${external.join(', ')}`);
  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
  console.log('no off-host requests, no page or console errors');
} finally {
  if (browser) await browser.close();
  server.kill();
}
