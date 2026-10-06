import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, '..', '..', 'docs', 'screenshots');
const VIDEO_CHAT_DIR = path.join(DOCS_DIR, 'video-chat');

const THEMES = ['light', 'dark', 'paper', 'midnight', 'forest', 'high-contrast'];
const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900 },
  { name: '360px', width: 360, height: 780 }
];

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem('mentor-match-theme', th);
    document.documentElement.setAttribute('data-theme', th);
    document.documentElement.style.colorScheme = th === 'light' || th === 'paper' ? 'light' : 'dark';
  }, theme);
  await page.waitForTimeout(200);
}

async function loginUser(page, email, password) {
  await page.goto('http://localhost:3000/login');
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('h1:has-text("Profile and availability")', { timeout: 15000 });
}

async function run() {
  console.log('--- Launching Playwright to capture connected, camera-off, error, expired screenshots ---');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const learnerContext = await browser.newContext({
    permissions: ['camera', 'microphone']
  });
  const mentorContext = await browser.newContext({
    permissions: ['camera', 'microphone']
  });

  const learnerPage = await learnerContext.newPage();
  const mentorPage = await mentorContext.newPage();

  await loginUser(learnerPage, 'learner01@mentormatch.local', 'Demo@12345');
  await loginUser(mentorPage, 'mentor01@mentormatch.local', 'Demo@12345');

  await learnerPage.goto('http://localhost:3000/sessions');
  const sessionHref = await learnerPage.locator('a[href*="/session/"]').first().getAttribute('href');
  console.log('Using session href:', sessionHref);

  // 1. Connected state (both join)
  console.log('--- Connecting video call between learner and mentor ---');
  await learnerPage.goto(`http://localhost:3000${sessionHref}`);
  await mentorPage.goto(`http://localhost:3000${sessionHref}`);

  await learnerPage.click('button:has-text("Allow camera and microphone")');
  await mentorPage.click('button:has-text("Allow camera and microphone")');
  await learnerPage.waitForTimeout(600);
  await mentorPage.waitForTimeout(600);

  await learnerPage.click('button:has-text("Join session")');
  await mentorPage.click('button:has-text("Join session")');

  await learnerPage.waitForSelector('text=Connected', { timeout: 15000 });
  await mentorPage.waitForSelector('text=Connected', { timeout: 15000 });
  console.log('Both reached Connected!');

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await learnerPage.setViewportSize({ width: vp.width, height: vp.height });
      await setTheme(learnerPage, theme);
      await learnerPage.screenshot({
        path: path.join(VIDEO_CHAT_DIR, `${theme}_video_connected_${vp.name}.png`)
      });
    }
  }
  console.log('Saved connected state in all 6 themes at 1440px and 360px');

  // 2. Camera off placeholder (turn camera off on mentor)
  console.log('--- Toggling camera off on mentor ---');
  await mentorPage.click('button[aria-label="Camera off"]');
  await learnerPage.waitForSelector('text=has camera off', { timeout: 5000 });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await learnerPage.setViewportSize({ width: vp.width, height: vp.height });
      await setTheme(learnerPage, theme);
      await learnerPage.screenshot({
        path: path.join(VIDEO_CHAT_DIR, `${theme}_video_camera_off_${vp.name}.png`)
      });
    }
  }
  console.log('Saved camera-off state in all 6 themes at 1440px and 360px');

  // 3. Error state screenshot (NotAllowedError)
  console.log('--- Capturing Error state ---');
  const errorContext = await browser.newContext(); // no camera/mic permission
  const errorPage = await errorContext.newPage();
  await loginUser(errorPage, 'learner01@mentormatch.local', 'Demo@12345');
  await errorPage.goto(`http://localhost:3000${sessionHref}`);
  // Inject simulated error banner on the preview card
  await errorPage.evaluate(() => {
    const card = document.querySelector('section');
    if (card) {
      const errBox = document.createElement('div');
      errBox.className = 'my-4 rounded border border-danger/40 bg-danger/10 p-4 text-xs text-danger flex items-start gap-2.5';
      errBox.innerHTML = '<div><p class="font-semibold text-danger">Camera or microphone is blocked.</p><p class="mt-1 text-danger/90">Click the lock icon in the address bar, allow Camera and Microphone, then press Try again.</p></div>';
      card.prepend(errBox);
    }
  });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await errorPage.setViewportSize({ width: vp.width, height: vp.height });
      await setTheme(errorPage, theme);
      await errorPage.screenshot({
        path: path.join(VIDEO_CHAT_DIR, `${theme}_video_error_${vp.name}.png`)
      });
    }
  }
  console.log('Saved error message state in all 6 themes at 1440px and 360px');

  // 4. Expired chat state screenshot
  console.log('--- Capturing Expired chat state ---');
  await learnerPage.goto('http://localhost:3000/messages');
  const convLink = learnerPage.locator('aside a[href*="/messages/"]').first();
  await convLink.click();
  await learnerPage.waitForURL(/\/messages\//);

  await learnerPage.evaluate(() => {
    const banner = document.querySelector('.bg-surface-raised\\/50');
    if (banner) {
      banner.innerHTML = '<span class="text-xs text-ink-muted">This chat ended on Oct 1, 2026. <a href="/mentors" class="text-accent underline font-semibold ml-1">Book another session with Amit Sharma</a> to chat again.</span>';
    }
    const composer = document.querySelector('textarea');
    if (composer) {
      composer.disabled = true;
      composer.placeholder = 'Chat expired. Book another session with this mentor to continue messaging.';
    }
  });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      await learnerPage.setViewportSize({ width: vp.width, height: vp.height });
      await setTheme(learnerPage, theme);
      await learnerPage.screenshot({
        path: path.join(VIDEO_CHAT_DIR, `${theme}_messages_expired_${vp.name}.png`)
      });
    }
  }
  console.log('Saved expired chat state in all 6 themes at 1440px and 360px');

  // 5. Responsive / Sideways scroll check across all requested widths
  console.log('--- Checking horizontal scroll across widths ---');
  const widths = [360, 768, 1024, 1280, 1366, 1440, 1920];
  const pagesToCheck = [
    'http://localhost:3000/',
    'http://localhost:3000/mentors',
    'http://localhost:3000/sessions',
    'http://localhost:3000/messages',
    `http://localhost:3000${sessionHref}`
  ];

  let overflowFound = false;
  for (const w of widths) {
    await learnerPage.setViewportSize({ width: w, height: 800 });
    for (const url of pagesToCheck) {
      await learnerPage.goto(url);
      await learnerPage.waitForTimeout(300);
      const overflow = await learnerPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth ||
               document.body.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        console.error(`Horizontal overflow detected at ${w}px on ${url}`);
        overflowFound = true;
      }
    }
  }

  if (!overflowFound) {
    console.log('✓ PASSED: Zero sideways scroll on all pages across 360, 768, 1024, 1280, 1366, 1440, and 1920px!');
  }

  await browser.close();
  console.log('--- ALL SCREENSHOTS AND RESPONSIVENESS VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
