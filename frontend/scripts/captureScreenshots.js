import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'images');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const THEMES = ['light', 'dark', 'paper', 'midnight', 'forest', 'high-contrast'];
const VIEWPORTS = [
  { name: '360px', width: 360, height: 780, isMobile: true },
  { name: '1440px', width: 1440, height: 900, isMobile: false }
];

const PAGES = [
  { name: 'landing', url: 'http://localhost:3000/' },
  { name: 'login', url: 'http://localhost:3000/login' },
  { name: 'register', url: 'http://localhost:3000/register' },
  { name: 'browse', url: 'http://localhost:3000/mentors' },
  { name: 'empty_state', url: 'http://localhost:3000/mentors?skill=NonExistentSkillXYZ99' },
  { name: 'not_found', url: 'http://localhost:3000/some-non-existent-route-404' }
];

async function run() {
  console.log('--- Launching Puppeteer for Screenshot Verification ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const networkErrors = [];
  const externalRequests = [];
  const consoleErrors = [];

  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      externalRequests.push(req.url());
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('some-non-existent-route') && !res.url().includes('NonExistentSkill')) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  for (const theme of THEMES) {
    console.log(`\n=== Theme: ${theme} ===`);

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      for (const p of PAGES) {
        await page.goto(p.url, { waitUntil: 'networkidle0' });

        // Set theme in localStorage & on documentElement
        await page.evaluate((t) => {
          localStorage.setItem('mentor-match-theme', t);
          document.documentElement.setAttribute('data-theme', t);
          document.documentElement.style.colorScheme = (t === 'dark' || t === 'midnight') ? 'dark' : 'light';
        }, theme);

        // Allow any CSS transitions to settle
        await new Promise((r) => setTimeout(r, 400));

        const filename = `${theme}_${p.name}_${vp.name}.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`Saved screenshot: ${filename}`);
      }
    }
  }

  await browser.close();

  console.log('\n--- Verification Audit Results ---');
  console.log(`External domain requests: ${externalRequests.length} (Expected: 0)`);
  if (externalRequests.length > 0) {
    console.error('VIOLATION: External requests found:', externalRequests);
  }

  console.log(`Failed asset requests (404/500): ${networkErrors.length} (Expected: 0)`);
  if (networkErrors.length > 0) {
    console.error('Network errors:', networkErrors);
  }

  console.log(`Console errors: ${consoleErrors.length} (Expected: 0)`);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  console.log('All screenshots captured successfully in docs/screenshots/images/');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
