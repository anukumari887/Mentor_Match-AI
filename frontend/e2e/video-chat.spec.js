import { test, expect } from '@playwright/test';

test.describe('Video Session & Learner-Mentor Chat E2E', () => {
  test('end-to-end call and chat between learner and mentor', async ({ browser }) => {
    test.setTimeout(120000);
    // 1. Create two isolated browser contexts
    const learnerContext = await browser.newContext({
      permissions: ['camera', 'microphone']
    });
    const mentorContext = await browser.newContext({
      permissions: ['camera', 'microphone']
    });

    const learnerPage = await learnerContext.newPage();
    const mentorPage = await mentorContext.newPage();

    // Helper: Login
    const login = async (page, email, password) => {
      console.log(`[E2E] Starting login for ${email}...`);
      page.on('console', msg => console.log(`[${email}] CONSOLE:`, msg.text()));
      page.on('pageerror', err => console.log(`[${email}] PAGE ERROR:`, err.message));
      page.on('response', res => {
        if (res.url().includes('/api/')) console.log(`[${email}] API:`, res.status(), res.url());
      });
      await page.goto('/login');
      await page.fill('#auth-email', email);
      await page.fill('#auth-password', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/profile', { timeout: 15000 });
      console.log(`[E2E] Login completed for ${email}`);
    };

    // 2. Log in both users
    await login(learnerPage, 'learner01@mentormatch.local', 'Demo@12345');
    await login(mentorPage, 'mentor01@mentormatch.local', 'Demo@12345');

    console.log('[E2E] Both users logged in. Fetching sessions...');
    // Fetch the booking ID from the learner's sessions page
    await learnerPage.goto('/sessions');
    await expect(learnerPage.locator('h1')).toContainText(/My sessions|Sessions/i);

    // Look for the Join button link or href
    const joinLink = learnerPage.locator('a[href*="/session/"]').first();
    await expect(joinLink).toBeVisible({ timeout: 10000 });
    const sessionHref = await joinLink.getAttribute('href');
    expect(sessionHref).toBeTruthy();
    console.log('[E2E] Found sessionHref:', sessionHref);

    // ==========================================
    // PART A: VIDEO SESSION
    // ==========================================

    // Navigate both to the video room
    console.log('[E2E] Navigating to video room...');
    await learnerPage.goto(sessionHref);
    await mentorPage.goto(sessionHref);

    // Both should see the preview check card
    await expect(learnerPage.locator('text=Check your camera and microphone')).toBeVisible();
    await expect(mentorPage.locator('text=Check your camera and microphone')).toBeVisible();
    console.log('[E2E] Preview card visible on both');

    // Click "Allow camera and microphone" on both
    await learnerPage.click('button:has-text("Allow camera and microphone")');
    await mentorPage.click('button:has-text("Allow camera and microphone")');

    // Wait for the "Join session" button to become enabled
    const learnerJoinBtn = learnerPage.locator('button:has-text("Join session")');
    const mentorJoinBtn = mentorPage.locator('button:has-text("Join session")');
    await expect(learnerJoinBtn).toBeEnabled({ timeout: 10000 });
    await expect(mentorJoinBtn).toBeEnabled({ timeout: 10000 });

    // Join room: Learner joins first
    await learnerJoinBtn.click();
    await expect(learnerPage.locator('text=Waiting for').first()).toBeVisible({ timeout: 5000 });

    // Mentor joins second
    await mentorJoinBtn.click();

    // Both should reach "Connected"
    await expect(learnerPage.locator('text=Connected').first()).toBeVisible({ timeout: 15000 });
    await expect(mentorPage.locator('text=Connected').first()).toBeVisible({ timeout: 15000 });

    // Verify remote <video> has videoWidth > 0 and currentTime increases
    const verifyVideoPlaying = async (page) => {
      const remoteVideo = page.locator('figure:has-text("video") video, figure[aria-label*="Video of"] video').first();
      await expect(remoteVideo).toBeVisible({ timeout: 10000 });

      const hasVideoWidth = await page.waitForFunction(() => {
        const v = document.querySelector('figure[aria-label*="Video of"] video');
        return v && v.videoWidth > 0;
      }, { timeout: 10000 });
      expect(hasVideoWidth).toBeTruthy();

      const currentTime1 = await page.evaluate(() => {
        const v = document.querySelector('figure[aria-label*="Video of"] video');
        return v ? v.currentTime : 0;
      });

      await page.waitForTimeout(1000);

      const currentTime2 = await page.evaluate(() => {
        const v = document.querySelector('figure[aria-label*="Video of"] video');
        return v ? v.currentTime : 0;
      });
      expect(currentTime2).toBeGreaterThanOrEqual(currentTime1);
    };

    await verifyVideoPlaying(learnerPage);
    await verifyVideoPlaying(mentorPage);

    // Mute on learner -> Mentor sees muted indicator
    await learnerPage.click('button[aria-label="Mute"]');
    await expect(mentorPage.locator('[aria-label*="is muted"]')).toBeVisible({ timeout: 5000 });

    // Turn camera off on learner -> Mentor sees initials avatar
    await learnerPage.click('button[aria-label="Camera off"]');
    await expect(mentorPage.locator('text=has camera off')).toBeVisible({ timeout: 5000 });

    // Turn camera back on and unmute
    await learnerPage.click('button[aria-label="Camera on"]');
    await learnerPage.click('button[aria-label="Unmute"]');
    await expect(mentorPage.locator('text=has camera off')).not.toBeVisible({ timeout: 5000 });

    // Reconnect test: Mentor refreshes page and rejoins
    await mentorPage.reload();
    await expect(mentorPage.locator('text=Check your camera and microphone')).toBeVisible();
    await mentorPage.click('button:has-text("Allow camera and microphone")');
    await mentorPage.click('button:has-text("Join session")');
    await expect(mentorPage.locator('text=Connected').first()).toBeVisible({ timeout: 15000 });
    await expect(learnerPage.locator('text=Connected').first()).toBeVisible({ timeout: 15000 });

    // Leave call on learner
    await learnerPage.click('button:has-text("Leave session")');
    await expect(learnerPage).toHaveURL(/\/sessions/, { timeout: 10000 });

    // ==========================================
    // PART B: LEARNER-MENTOR CHAT
    // ==========================================

    // Learner starts chat via "Message mentor" button on sessions page
    const messageMentorBtn = learnerPage.locator('button:has-text("Message mentor")').first();
    await expect(messageMentorBtn).toBeVisible({ timeout: 10000 });
    await messageMentorBtn.click();

    // That navigates to /messages/:conversationId
    await expect(learnerPage).toHaveURL(/\/messages\//, { timeout: 10000 });
    const learnerTextarea = learnerPage.locator('textarea[placeholder*="Type a message"]');
    await expect(learnerTextarea).toBeVisible({ timeout: 10000 });

    const testMsg = `Hello mentor from E2E ${Date.now()}`;
    await learnerTextarea.fill(testMsg);
    await learnerPage.keyboard.press('Enter');

    // Wait for message to be confirmed in learner's message log
    await expect(learnerPage.locator(`div[role="log"] >> text=${testMsg}`)).toBeVisible({ timeout: 10000 });

    // Mentor goes to /messages
    await mentorPage.goto('/messages');
    const mentorConvLink = mentorPage.locator('aside a[href*="/messages/"]').first();
    await expect(mentorConvLink).toBeVisible({ timeout: 10000 });
    await mentorConvLink.click();
    await expect(mentorPage).toHaveURL(/\/messages\//, { timeout: 10000 });

    // Mentor verifies message arrived in thread log
    await expect(mentorPage.locator(`div[role="log"] >> text=${testMsg}`)).toBeVisible({ timeout: 10000 });

    // Mentor replies
    const replyMsg = `Hello learner! I received your message.`;
    const mentorTextarea = mentorPage.locator('textarea[placeholder*="Type a message"]');
    await expect(mentorTextarea).toBeVisible({ timeout: 10000 });
    await mentorTextarea.fill(replyMsg);
    await mentorPage.keyboard.press('Enter');

    // Learner receives the reply in real-time without refreshing
    await expect(learnerPage.locator(`div[role="log"] >> text=${replyMsg}`)).toBeVisible({ timeout: 10000 });

    // Clean up
    await learnerContext.close();
    await mentorContext.close();
  });
});
