import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'before-notifications');
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
  await new Promise((r) => setTimeout(r, 400));
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

async function logout(page) {
  await page.evaluate(async () => {
    await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  });
  await new Promise((r) => setTimeout(r, 300));
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

async function captureNavbar(page, pageName) {
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
    await applyLightTheme(page);
    const filename = `light_${pageName}_${vp.name}.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, filename),
      clip: { x: 0, y: 0, width: vp.width, height: 75 }
    });
    console.log(`Saved: ${filename}`);
  }
}

async function run() {
  console.log('--- Capturing BEFORE screenshots for Notifications, Verify, Calendar ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Register page
  await logout(page);
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
  await capture(page, 'register');

  // Navbar (logged out)
  await captureNavbar(page, 'navbar_logged_out');

  // 2. Learner dashboard & sessions & settings & navbar
  await login(page, 'learner01@mentormatch.local', 'Demo@12345');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await capture(page, 'learner_dashboard');
  await captureNavbar(page, 'navbar_learner');

  await page.goto('http://localhost:3000/sessions', { waitUntil: 'networkidle0' });
  await capture(page, 'my_sessions');

  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle0' });
  await capture(page, 'settings');

  // 3. Mentor dashboard
  await logout(page);
  await login(page, 'mentor01@mentormatch.local', 'Demo@12345');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await capture(page, 'mentor_dashboard');
  await captureNavbar(page, 'navbar_mentor');

  // 4. Admin dashboard
  await logout(page);
  await login(page, 'admin@mentormatch.local', 'ChangeMe123!');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
  await capture(page, 'admin_dashboard');

  await browser.close();
  console.log('Successfully captured all before screenshots in docs/screenshots/before-notifications/');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
