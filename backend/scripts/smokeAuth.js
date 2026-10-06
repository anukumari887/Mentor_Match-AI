const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/models/User');
const LearnerProfile = require('../src/models/LearnerProfile');
const MentorProfile = require('../src/models/MentorProfile');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const emailPrefix = `phase2-smoke-${randomUUID()}`;
const emails = {
  learner: `${emailPrefix}-learner@example.test`,
  mentor: `${emailPrefix}-mentor@example.test`
};
const userIds = [];

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie')];
  const sessionCookie = setCookies.find((value) => value?.startsWith('token='))?.split(';')[0];
  return { status: response.status, data, sessionCookie };
}

async function runSmoke() {
  const learnerRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Phase Two Learner', email: emails.learner, password: 'TestPass123!', role: 'learner' }
  });
  assert.equal(learnerRegistration.status, 201, JSON.stringify(learnerRegistration.data));
  assert.ok(learnerRegistration.sessionCookie, 'Registration must set the session cookie.');
  userIds.push(learnerRegistration.data.user.id);

  const learnerMe = await request('/api/auth/me', { cookie: learnerRegistration.sessionCookie });
  assert.equal(learnerMe.status, 200);
  assert.equal(learnerMe.data.user.role, 'learner');

  const learnerUpdate = await request('/api/profile', {
    method: 'PUT',
    cookie: learnerRegistration.sessionCookie,
    body: {
      goals: 'Grow as a software engineer',
      knownSkills: ['JavaScript'],
      wantedSkills: ['System design'],
      level: 'intermediate',
      budgetPerHour: 800,
      availability: [{ dayOfWeek: 2, startTime: '18:00', endTime: '20:00' }]
    }
  });
  assert.equal(learnerUpdate.status, 200, JSON.stringify(learnerUpdate.data));
  assert.deepEqual(learnerUpdate.data.profile.wantedSkills, ['System design']);

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    cookie: learnerRegistration.sessionCookie
  });
  assert.equal(logout.status, 200);
  assert.equal((await request('/api/auth/me')).status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: emails.learner, password: 'TestPass123!' }
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal((await request('/api/auth/me', { cookie: login.sessionCookie })).status, 200);

  const mentorRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Phase Two Mentor', email: emails.mentor, password: 'TestPass123!', role: 'mentor' }
  });
  assert.equal(mentorRegistration.status, 201, JSON.stringify(mentorRegistration.data));
  userIds.push(mentorRegistration.data.user.id);

  const mentorUpdate = await request('/api/profile', {
    method: 'PUT',
    cookie: mentorRegistration.sessionCookie,
    body: {
      headline: 'Software engineering mentor',
      bio: 'Practical guidance for growing engineers.',
      skills: ['JavaScript', 'Node.js'],
      experienceYears: 8,
      pricePerHour: 900,
      timezone: 'Asia/Kolkata',
      availability: [{ dayOfWeek: 6, startTime: '10:00', endTime: '12:00' }]
    }
  });
  assert.equal(mentorUpdate.status, 200, JSON.stringify(mentorUpdate.data));
  assert.equal(mentorUpdate.data.profile.headline, 'Software engineering mentor');
}

async function cleanup() {
  await mongoose.connect(env.MONGO_URI);
  try {
    const ids = userIds.map((id) => new mongoose.Types.ObjectId(id));
    await Promise.all([
      LearnerProfile.deleteMany({ userId: { $in: ids } }),
      MentorProfile.deleteMany({ userId: { $in: ids } }),
      User.deleteMany({ email: { $in: Object.values(emails) } })
    ]);
  } finally {
    await mongoose.disconnect();
  }
}

(async () => {
  let failure;
  try {
    await runSmoke();
  } catch (error) {
    failure = error;
  }

  try {
    await cleanup();
  } catch (error) {
    failure = failure || error;
  }

  if (failure) {
    process.stderr.write(`${failure.message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Auth smoke passed: learner/mentor registration, profile updates, logout, login, and session restoration. Temporary records removed.\n');
})();