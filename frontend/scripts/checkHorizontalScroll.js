import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Login as learner
  await page.goto('http://localhost:3000/login');
  await page.fill('#auth-email', 'learner01@mentormatch.local');
  await page.fill('#auth-password', 'Demo@12345');
  await page.click('button[type="submit"]');
  await page.waitForSelector('h1:has-text("Profile and availability")', { timeout: 15000 });

  await page.goto('http://localhost:3000/sessions');
  const sessionHref = await page.locator('a[href*="/session/"]').first().getAttribute('href');

  const widths = [360, 768, 1024, 1280, 1366, 1440, 1920];
  const pagesToCheck = [
    'http://localhost:3000/',
    'http://localhost:3000/mentors',
    'http://localhost:3000/sessions',
    'http://localhost:3000/messages',
    `http://localhost:3000${sessionHref}`
  ];

  let anyOverflow = false;
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const url of pagesToCheck) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth ||
               document.body.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        const details = await page.evaluate(() => ({
          docScroll: document.documentElement.scrollWidth,
          bodyScroll: document.body.scrollWidth,
          winInner: window.innerWidth
        }));
        console.error(`OVERFLOW DETECTED: at ${w}px on ${url}`, details);
        anyOverflow = true;
      }
    }
  }

  // Also check mentor role in a clean context at 1280, 1366, 1440
  const mentorContext = await browser.newContext();
  const mentorPage = await mentorContext.newPage();
  await mentorPage.goto('http://localhost:3000/login');
  await mentorPage.fill('#auth-email', 'mentor01@mentormatch.local');
  await mentorPage.fill('#auth-password', 'Demo@12345');
  await mentorPage.click('button[type="submit"]');
  await mentorPage.waitForSelector('h1:has-text("Profile and availability")', { timeout: 15000 });

  for (const w of [1280, 1366, 1440]) {
    await mentorPage.setViewportSize({ width: w, height: 800 });
    for (const url of pagesToCheck) {
      await mentorPage.goto(url, { waitUntil: 'networkidle' });
      const overflow = await mentorPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth ||
               document.body.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        const details = await mentorPage.evaluate(() => ({
          docScroll: document.documentElement.scrollWidth,
          bodyScroll: document.body.scrollWidth,
          winInner: window.innerWidth
        }));
        console.error(`MENTOR OVERFLOW DETECTED: at ${w}px on ${url}`, details);
        anyOverflow = true;
      }
    }
  }

  await browser.close();

  if (!anyOverflow) {
    console.log('SUCCESS: Zero horizontal scroll detected across all pages and widths (360, 768, 1024, 1280, 1366, 1440, 1920px) for both learner and mentor!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
