import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(process.cwd(), 'temp-chrome-profile');
const SCREENSHOTS_DIR = path.join(process.cwd(), 'docs', 'screenshots', 'themes');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  async setTheme(theme) {
    await this.evaluate(`
      document.documentElement.setAttribute('data-theme', '${theme}');
      try { localStorage.setItem('mentor_match_theme', '${theme}'); } catch(e){}
    `);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  async captureScreenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false
    });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log('Starting headless Chrome for theme screenshots...');
  if (!fs.existsSync(TEMP_PROFILE)) {
    fs.mkdirSync(TEMP_PROFILE, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${TEMP_PROFILE}`,
    'about:blank'
  ]);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    const { webSocketDebuggerUrl } = await res.json();
    
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const pageList = await listRes.json();
    const targetPage = pageList.find((p) => p.type === 'page') || pageList[0];
    const client = new CDPClient(targetPage.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    console.log('Setting up active booking for checkout screenshot...');
    // Login as learner and get or create a booking
    let bookingId = '6ac4c91817222e12b5bee77d';
    let mentorId = '6ac3f3d7ef48c2e90ee325e0';

    const themes = ['light', 'dark', 'paper', 'midnight', 'forest', 'high-contrast'];
    const viewports = [
      { name: 'desktop', width: 1280, height: 800, isMobile: false },
      { name: 'phone', width: 375, height: 812, isMobile: true }
    ];

    const pages = [
      {
        name: 'landing',
        url: 'http://localhost:3000/',
        auth: 'none'
      },
      {
        name: 'browse_mentors',
        url: 'http://localhost:3000/mentors',
        auth: 'learner'
      },
      {
        name: 'mentor_detail',
        url: `http://localhost:3000/mentors/${mentorId}`,
        auth: 'learner'
      },
      {
        name: 'checkout',
        url: `http://localhost:3000/checkout/${bookingId}`,
        auth: 'learner'
      },
      {
        name: 'admin',
        url: 'http://localhost:3000/admin',
        auth: 'admin'
      }
    ];

    let currentAuth = 'none';

    for (const page of pages) {
      console.log(`\n--- Capturing page: ${page.name} (${page.url}) ---`);

      // Handle Authentication if required
      if (page.auth !== currentAuth) {
        if (page.auth === 'learner') {
          console.log('Logging in as learner...');
          await client.evaluate(`
            (async () => {
              await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: 'learner01@mentormatch.local', password: 'Demo@12345' })
              });
            })()
          `);
          await client.navigate('http://localhost:3000/mentors');
          currentAuth = 'learner';
        } else if (page.auth === 'admin') {
          console.log('Logging in as admin...');
          await client.evaluate(`
            (async () => {
              await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: 'admin@mentormatch.local', password: 'ChangeMe123!' })
              });
            })()
          `);
          await client.navigate('http://localhost:3000/admin');
          currentAuth = 'admin';
        }
      } else {
        await client.navigate(page.url);
      }

      for (const vp of viewports) {
        await client.setViewport(vp.width, vp.height, vp.isMobile);
        await new Promise((resolve) => setTimeout(resolve, 500));

        for (const theme of themes) {
          await client.setTheme(theme);
          const fileName = `${page.name}_${theme}_${vp.name}.png`;
          const filePath = path.join(SCREENSHOTS_DIR, fileName);
          await client.captureScreenshot(filePath);
          console.log(`Saved screenshot: ${fileName}`);
        }
      }
    }

    client.close();
    console.log('\nAll 60 theme screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot generation:', err);
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch (_) {}
  }
}

run();
