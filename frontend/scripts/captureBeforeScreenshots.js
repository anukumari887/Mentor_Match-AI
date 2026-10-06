import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'before-logo-images-status');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const THEMES = ['light', 'paper'];
const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900, isMobile: false },
  { name: '360px', width: 360, height: 780, isMobile: true }
];

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('mentor-match-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = (t === 'dark' || t === 'midnight') ? 'dark' : 'light';
  }, theme);
  await new Promise((r) => setTimeout(r, 300));
}

async function captureVariants(page, pageName) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
      await applyTheme(page, theme);
      const filename = `${theme}_${pageName}_${vp.name}.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
      console.log(`Saved: ${filename}`);
    }
  }
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
  await new Promise((r) => setTimeout(r, 300));
}

async function logout(page) {
  await page.evaluate(async () => {
    await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function run() {
  console.log('--- Capturing BEFORE screenshots efficiently ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Landing
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'landing');

  // 2. Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'login');

  // 3. Register
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'register');

  // 4. Learner Dashboard & My Sessions
  await login(page, 'learner01@mentormatch.local', 'Demo@12345');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'learner_dashboard');

  await page.goto('http://localhost:3000/sessions', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'my_sessions');

  // 5. Mentor Dashboard
  await logout(page);
  await login(page, 'mentor01@mentormatch.local', 'Demo@12345');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'mentor_dashboard');

  // 6. Admin Mentors Page
  await logout(page);
  await login(page, 'admin@mentormatch.local', 'ChangeMe123!');
  await page.goto('http://localhost:3000/admin/mentors', { waitUntil: 'networkidle0' });
  await captureVariants(page, 'admin_mentors');

  await browser.close();
  console.log('\nAll 28 BEFORE screenshots captured successfully in docs/screenshots/before-logo-images-status/');
}

run().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
