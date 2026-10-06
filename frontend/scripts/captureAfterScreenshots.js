import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const REPO_ROOT = process.cwd().endsWith('frontend') ? path.join(process.cwd(), '..') : process.cwd();
const SCREENSHOT_DIR = path.join(REPO_ROOT, 'docs', 'screenshots', 'logo-images-status');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const THEMES = ['light', 'dark', 'paper', 'midnight', 'forest', 'high-contrast'];
const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900, isMobile: false },
  { name: '360px', width: 360, height: 780, isMobile: true }
];

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== Capturing Verification Screenshots in docs/screenshots/logo-images-status/ ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper to apply theme
  async function setTheme(t) {
    await page.evaluate((themeName) => {
      localStorage.setItem('mentor-match-theme', themeName);
      document.documentElement.setAttribute('data-theme', themeName);
      document.documentElement.style.colorScheme =
        themeName === 'dark' || themeName === 'midnight' ? 'dark' : 'light';
    }, t);
    await sleep(200);
  }

  // -------------------------------------------------------------
  // PHASE 1: Public Pages (Navbar logo, Landing, Login, Register, Reset)
  // -------------------------------------------------------------
  console.log('--- Phase 1: Capturing Public Pages ---');
  // Clear any existing cookies
  const cookies = await page.cookies();
  if (cookies.length > 0) await page.deleteCookie(...cookies);

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      // Landing & Navbar logo
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      const navbarEl = await page.$('header nav, header');
      if (navbarEl) {
        await navbarEl.screenshot({
          path: path.join(SCREENSHOT_DIR, `${theme}_navbar_logo_${vp.name}.png`)
        });
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_landing_${vp.name}.png`),
        fullPage: false
      });

      // Login page
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_login_${vp.name}.png`),
        fullPage: false
      });

      // Register page
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_register_${vp.name}.png`),
        fullPage: false
      });

      // Reset password page
      await page.goto(
        `${BASE_URL}/reset-password?token=a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123`,
        { waitUntil: 'networkidle0' }
      );
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_reset_password_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  // -------------------------------------------------------------
  // PHASE 2: Learner Pages (Dashboard, Sessions, Settings) - 1 Login
  // -------------------------------------------------------------
  console.log('\n--- Phase 2: Capturing Learner Pages (1 Login) ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'learner01@mentormatch.local');
  await page.type('input[type="password"]', 'Demo@12345');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 });
  await sleep(600);

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      // Learner Dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_learner_dashboard_${vp.name}.png`),
        fullPage: false
      });

      // Sessions - Upcoming
      await page.goto(`${BASE_URL}/sessions`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_sessions_upcoming_${vp.name}.png`),
        fullPage: false
      });

      // Sessions - Past Tab & Cancelled Tab
      const tabButtons = await page.$$('div[role="tablist"] button[role="tab"]');
      if (tabButtons.length >= 2) {
        await page.evaluate((el) => el.click(), tabButtons[1]);
        await sleep(300);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${theme}_sessions_past_${vp.name}.png`),
          fullPage: false
        });
      }

      if (tabButtons.length >= 3) {
        await page.evaluate((el) => el.click(), tabButtons[2]);
        await sleep(300);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${theme}_sessions_cancelled_${vp.name}.png`),
          fullPage: false
        });
      }

      // Settings page
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_settings_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  // -------------------------------------------------------------
  // PHASE 3: Pending Mentor Pages (ApprovalBanner) - 1 Login
  // -------------------------------------------------------------
  console.log('\n--- Phase 3: Capturing Pending Mentor Banner (1 Login) ---');
  const pendingMentorEmail = 'mentor_pending_banner@mentormatch.local';
  try {
    await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pending Mentor',
        email: pendingMentorEmail,
        password: 'Demo@12345',
        role: 'mentor'
      })
    });
  } catch (e) {}

  const activeCookies = await page.cookies();
  if (activeCookies.length > 0) await page.deleteCookie(...activeCookies);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', pendingMentorEmail);
  await page.type('input[type="password"]', 'Demo@12345');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 });
  await sleep(600);

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
      await setTheme(theme);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme}_mentor_dashboard_banner_${vp.name}.png`),
        fullPage: false
      });
    }
  }

  await browser.close();
  console.log('\n=== All screenshots captured successfully in docs/screenshots/logo-images-status/ ===');
}

run().catch((err) => {
  console.error('Screenshot Capture Error:', err);
  process.exit(1);
});
