import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';
const MAILPIT_URL = 'http://localhost:8025/api/v1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLatestMailpitMessage(recipientEmail) {
  const res = await fetch(`${MAILPIT_URL}/messages`);
  const data = await res.json();
  const msg = data.messages.find((m) =>
    m.To.some((t) => t.Address.toLowerCase() === recipientEmail.toLowerCase())
  );
  if (!msg) return null;
  const detailRes = await fetch(`${MAILPIT_URL}/message/${msg.ID}`);
  return await detailRes.json();
}

async function run() {
  console.log('=== Starting Complete E2E Verification ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // FLOW 1: Register new mentor & test ApprovalBanner lifecycle
  // -------------------------------------------------------------
  console.log('--- 1. Testing Mentor Registration & Approval Lifecycle ---');
  const uniqueMentorEmail = `testmentor_${Date.now()}@mentormatch.local`;
  const mentorPassword = 'SecurePassword123!';

  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
  // Click Mentor card
  const mentorChoice = await page.$('input[value="mentor"]');
  if (mentorChoice) {
    await mentorChoice.click();
  } else {
    // Click button or radio
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Mentor') || text.includes('I want to mentor')) {
        await btn.click();
        break;
      }
    }
  }

  await page.type('input[name="name"], input[placeholder*="name" i]', 'Alok Sharma');
  await page.type('input[type="email"]', uniqueMentorEmail);
  await page.type('input[type="password"]', mentorPassword);

  // Submit registration
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await page.waitForFunction(() => !window.location.pathname.includes('/register'), { timeout: 6000 });
  await sleep(1000);

  console.log(`Mentor registered: ${uniqueMentorEmail}`);
  console.log(`Current URL: ${page.url()}`);

  // Check ApprovalBanner is visible on dashboard
  await page.waitForSelector('[role="status"]', { timeout: 5000 });
  const bannerText = await page.$eval('[role="status"]', el => el.textContent);
  console.log(`ApprovalBanner Text after registration: "${bannerText.trim()}"`);
  if (!bannerText.includes('Finish your profile to be reviewed')) {
    throw new Error('ApprovalBanner did not display incomplete profile warning!');
  }

  // Update profile via API to complete it
  console.log('Completing mentor profile...');
  const mentorLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueMentorEmail, password: mentorPassword })
  });
  const mentorCookies = mentorLoginRes.headers.get('set-cookie')?.split(';')[0];
  const mentorData = await mentorLoginRes.json();

  const updateProfileRes = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie: mentorCookies },
    body: JSON.stringify({
      headline: 'Senior Full Stack Engineer & Cloud Architect',
      bio: 'Over 10 years of experience building distributed systems. I mentor aspiring software engineers in full-stack architecture and reliable systems design.',
      skills: ['JavaScript', 'React', 'Node.js', 'System Design'],
      pricePerHour: 1000,
      experienceYears: 10,
      availability: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },
        { dayOfWeek: 3, startTime: '14:00', endTime: '16:00' }
      ]
    })
  });
  console.log(`Profile update status: ${updateProfileRes.status}`);

  // Refresh dashboard and inspect banner
  await page.reload({ waitUntil: 'networkidle0' });
  const bannerTextComplete = await page.$eval('[role="status"]', el => el.textContent);
  console.log(`ApprovalBanner Text after profile completion: "${bannerTextComplete.trim()}"`);
  if (!bannerTextComplete.includes('Your profile is waiting for admin approval')) {
    throw new Error('ApprovalBanner did not display waiting for admin approval!');
  }

  // Admin login and rejection
  console.log('Testing Admin Rejection with reason...');
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mentormatch.local', password: 'ChangeMe123!' })
  });
  const adminCookies = adminLoginRes.headers.get('set-cookie')?.split(';')[0];

  const rejectRes = await fetch(`${API_URL}/admin/mentors/${mentorData.user.id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: adminCookies },
    body: JSON.stringify({
      reason: 'Please provide more details in your bio regarding your past teaching and mentoring experience.'
    })
  });
  console.log(`Admin rejection status: ${rejectRes.status}`);

  // Reload mentor page
  await page.reload({ waitUntil: 'networkidle0' });
  const bannerTextRejected = await page.$eval('[role="status"]', el => el.textContent);
  console.log(`ApprovalBanner Text after rejection: "${bannerTextRejected.trim()}"`);
  if (!bannerTextRejected.includes('Profile review feedback') || !bannerTextRejected.includes('Please provide more details')) {
    throw new Error('ApprovalBanner did not display rejection reason!');
  }

  // Admin approves mentor
  console.log('Testing Admin Approval...');
  const approveRes = await fetch(`${API_URL}/admin/mentors/${mentorData.user.id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: adminCookies }
  });
  console.log(`Admin approval status: ${approveRes.status}`);

  // Reload mentor page
  await page.reload({ waitUntil: 'networkidle0' });
  const approvedBannerCount = await page.$$eval('[role="status"]', els => els.length);
  console.log(`Banner count on mentor dashboard after approval: ${approvedBannerCount}`);

  // Verify mentor is now visible in browse mentors
  await page.goto(`${BASE_URL}/mentors?q=Alok`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  const browseContent = await page.evaluate(() => document.body.innerText);
  const foundInBrowse = browseContent.includes('Alok Sharma');
  console.log(`Approved mentor visible in browse search: ${foundInBrowse}`);
  if (!foundInBrowse) {
    throw new Error('Approved mentor was not found in public mentor browse!');
  }

  // -------------------------------------------------------------
  // FLOW 2: Learner Payment & Refund Status
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Learner Payment & Refund Status on My Sessions ---');
  // Clear any logged-in user cookies
  const activeCookies = await page.cookies();
  if (activeCookies.length > 0) {
    await page.deleteCookie(...activeCookies);
  }

  // Log in as learner01 on page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'learner01@mentormatch.local');
  await page.type('input[type="password"]', 'Demo@12345');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 });
  await sleep(1000);

  // Navigate to My Sessions
  await page.goto(`${BASE_URL}/sessions`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  const sessionsBody = await page.evaluate(() => document.body.innerText);
  const hasPaidBadge = sessionsBody.includes('Paid') || sessionsBody.includes('PAID');
  console.log(`Has 'Paid' badge on My Sessions: ${hasPaidBadge}`);
  if (!hasPaidBadge) {
    throw new Error('My sessions page did not display Paid badge!');
  }

  // -------------------------------------------------------------
  // FLOW 3: Settings Page & Password Change Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Settings Page & Password Change Lifecycle ---');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#current-password');

  // Verify read-only account details
  const pageText = await page.evaluate(() => document.body.innerText);
  if (!pageText.includes('learner01@mentormatch.local')) {
    throw new Error('Settings page did not render account email!');
  }

  // Test mismatch validation
  await page.type('#current-password', 'Demo@12345');
  await page.type('#new-password', 'NewValidPass123!');
  await page.type('#confirm-password', 'DifferentPass123!');

  const savePassBtn = await page.$('form button[type="submit"]');
  await savePassBtn.click();
  await sleep(500);

  const errorText = await page.evaluate(() => document.body.innerText);
  if (!errorText.toLowerCase().includes('passwords do not match')) {
    throw new Error('Mismatch error did not display!');
  }

  // Clear and enter matching password
  await page.$eval('#confirm-password', el => el.value = '');
  await page.type('#confirm-password', 'NewValidPass123!');

  // Setup second browser context to verify old session revocation
  const browser2 = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page2 = await browser2.newPage();
  // Login on page2 before password change
  await page2.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page2.type('input[type="email"]', 'learner01@mentormatch.local');
  await page2.type('input[type="password"]', 'Demo@12345');
  await page2.click('button[type="submit"]');
  await page2.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 6000 });
  await sleep(1000);
  console.log('Session 2 established on browser2');

  // Submit password change on page 1
  await savePassBtn.click();
  await sleep(1500);

  // Check email in Mailpit
  const changedEmail = await getLatestMailpitMessage('learner01@mentormatch.local');
  console.log(`Received password change notification email:`, changedEmail?.Snippet || changedEmail?.Subject);
  if (!changedEmail || !changedEmail.Subject.includes('Your Mentor-Match password was changed')) {
    throw new Error('Password changed notification email was not found in Mailpit!');
  }

  // Try using browser2 (old session) - should be logged out / 401
  await page2.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
  await sleep(500);
  const page2Url = page2.url();
  console.log(`Browser 2 URL after password change: ${page2Url}`);
  if (!page2Url.includes('/login')) {
    throw new Error('Session 2 was not revoked after password change!');
  }
  await browser2.close();

  // Change learner password back via API
  const reLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'learner01@mentormatch.local', password: 'NewValidPass123!' })
  });
  const reLoginCookies = reLoginRes.headers.get('set-cookie')?.split(';')[0];
  await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: reLoginCookies },
    body: JSON.stringify({ currentPassword: 'NewValidPass123!', newPassword: 'Demo@12345' })
  });
  console.log('Reverted learner password back to Demo@12345');

  // -------------------------------------------------------------
  // FLOW 4: Forgot Password & Reset Password Workflow
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Forgot Password & Reset Password Workflow ---');
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#forgot-email');
  await page.type('#forgot-email', 'learner01@mentormatch.local');
  await page.click('form button[type="submit"]');
  await sleep(2000);

  const forgotPageText = await page.evaluate(() => document.body.innerText);
  console.log('Forgot password page text after submit:', forgotPageText.slice(0, 200));
  if (!forgotPageText.includes('If an account exists for that email, we have sent a reset link')) {
    throw new Error('Forgot password confirmation message not shown!');
  }

  // Retrieve reset email from Mailpit
  const resetEmail = await getLatestMailpitMessage('learner01@mentormatch.local');
  console.log('Found reset email in Mailpit:', resetEmail?.Subject);
  const match = resetEmail.HTML.match(/reset-password\?token=([a-f0-9]{64})/i) ||
                resetEmail.Text.match(/reset-password\?token=([a-f0-9]{64})/i);
  if (!match) {
    throw new Error('Reset token was not found in Mailpit email body!');
  }
  const resetToken = match[1];
  console.log(`Extracted reset token (first 10 chars): ${resetToken.slice(0, 10)}...`);

  // Navigate to reset password page with token
  await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`, { waitUntil: 'networkidle0' });
  await sleep(500);

  // Verify token was scrubbed from URL
  const currentResetUrl = page.url();
  console.log(`Reset page URL after scrub: ${currentResetUrl}`);
  if (currentResetUrl.includes('token=')) {
    throw new Error('Token was not removed from address bar!');
  }

  // Fill new password
  const resetInputs = await page.$$('input[type="password"]');
  await resetInputs[0].type('NewResetPass999!');
  await resetInputs[1].type('NewResetPass999!');

  const resetBtn = await page.$('button[type="submit"]');
  await resetBtn.click();
  await sleep(1500);

  const resetSuccessText = await page.evaluate(() => document.body.innerText);
  console.log('Reset page text after submit:', resetSuccessText.slice(0, 150));
  if (!resetSuccessText.includes('Password changed')) {
    throw new Error('Password reset success state not displayed!');
  }

  // Verify token cannot be reused
  const reuseRes = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'AnotherPassword123!' })
  });
  console.log(`Reusing used token status code: ${reuseRes.status}`);
  if (reuseRes.status !== 400) {
    throw new Error('Used reset token was not rejected with 400!');
  }

  // Login with new password
  const loginWithNewRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'learner01@mentormatch.local', password: 'NewResetPass999!' })
  });
  console.log(`Login with reset password status code: ${loginWithNewRes.status}`);
  if (loginWithNewRes.status !== 200) {
    throw new Error('Could not login with newly reset password!');
  }

  // Revert learner password back to Demo@12345
  const resetRevertCookies = loginWithNewRes.headers.get('set-cookie');
  await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: resetRevertCookies },
    body: JSON.stringify({ currentPassword: 'NewResetPass999!', newPassword: 'Demo@12345' })
  });
  console.log('Successfully reverted learner password back to Demo@12345');

  await browser.close();
  console.log('\n=== ALL E2E VERIFICATION CHECKS PASSED PERFECTLY! ===');
}

run().catch((err) => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
