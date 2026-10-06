import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'screenshots', 'before-video');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900, isMobile: false },
  { name: '360px', width: 360, height: 780, isMobile: true }
];

async function applyLightTheme(page) {
  await page.evaluate(() => {
    localStorage.setItem('mentor-match-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function login(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.evaluate(async (em, pw) => {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: pw }),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Login failed: ' + res.status);
  }, email, password);
  await new Promise((r) => setTimeout(r, 400));
}

async function capture(page, pageName) {
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
    await applyLightTheme(page);
    const filename = `light_${pageName}_${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved: ${filename}`);
  }
}

async function run() {
  console.log('--- Capturing BEFORE screenshots for Video, Landing, Sessions, Mentor Detail ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Landing page
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await capture(page, 'landing');

  // 2. Mentor detail page (can be viewed public or logged in)
  await page.goto('http://localhost:3000/mentors/6ac3f3d7ef48c2e90ee325cd', { waitUntil: 'networkidle0' });
  await capture(page, 'mentor_detail');

  // Login as learner01 for sessions and video room
  await login(page, 'learner01@mentormatch.local', 'Demo@12345');

  // 3. Learner My sessions page
  await page.goto('http://localhost:3000/sessions', { waitUntil: 'networkidle0' });
  await capture(page, 'learner_sessions');

  // 4. Video room page
  await page.goto('http://localhost:3000/session/6ac3f3d7ef48c2e90ee32628', { waitUntil: 'networkidle0' });
  // wait 1s for component to mount and socket/state check
  await new Promise((r) => setTimeout(r, 1000));
  await capture(page, 'video_room');

  await browser.close();
  console.log('Successfully captured all before-video screenshots in docs/screenshots/before-video/');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
