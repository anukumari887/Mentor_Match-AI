const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/models/User');
const MentorProfile = require('../src/models/MentorProfile');
const LearnerProfile = require('../src/models/LearnerProfile');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const temporaryEmail = `phase3-smoke-${randomUUID()}@example.test`;
let temporaryMentorId;

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
  const learnerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'learner01@mentormatch.local', password: 'Demo@12345' }
  });
  assert.equal(learnerLogin.status, 200, JSON.stringify(learnerLogin.data));

  const listing = await request('/api/mentors?sort=price_asc&limit=50', { cookie: learnerLogin.sessionCookie });
  assert.equal(listing.status, 200, JSON.stringify(listing.data));
  assert.equal(listing.data.total, 12);
  assert.ok(listing.data.items.every((mentor) => mentor.approvalStatus === 'approved'));
  assert.ok(listing.data.items.every((mentor) => !('email' in mentor)));

  const nodeMentors = await request('/api/mentors?skill=Node.js&minPrice=1000&maxPrice=1300&sort=price_asc', {
    cookie: learnerLogin.sessionCookie
  });
  assert.equal(nodeMentors.status, 200);
  assert.ok(nodeMentors.data.items.length >= 2);
  assert.ok(nodeMentors.data.items.every((mentor) => mentor.pricePerHour >= 1000 && mentor.pricePerHour <= 1300));
  assert.ok(nodeMentors.data.items[0].pricePerHour <= nodeMentors.data.items[1].pricePerHour);

  const pendingSearch = await request('/api/mentors?q=Kabir', { cookie: learnerLogin.sessionCookie });
  assert.equal(pendingSearch.status, 200);
  assert.equal(pendingSearch.data.total, 0);

  const detailId = listing.data.items[0].id;
  const detail = await request(`/api/mentors/${detailId}`, { cookie: learnerLogin.sessionCookie });
  assert.equal(detail.status, 200);
  assert.equal(detail.data.mentor.id, detailId);

  const forbiddenQueue = await request('/api/admin/mentors', { cookie: learnerLogin.sessionCookie });
  assert.equal(forbiddenQueue.status, 403);

  const mentorRegistration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Temporary Review Mentor', email: temporaryEmail, password: 'TestPass123!', role: 'mentor' }
  });
  assert.equal(mentorRegistration.status, 201, JSON.stringify(mentorRegistration.data));
  temporaryMentorId = mentorRegistration.data.user.id;
  const profileUpdate = await request('/api/profile', {
    method: 'PUT',
    cookie: mentorRegistration.sessionCookie,
    body: {
      headline: 'Temporary discovery smoke profile',
      bio: 'This profile is removed when the smoke test completes.',
      skills: ['System Design'],
      experienceYears: 4,
      pricePerHour: 650,
      timezone: 'Asia/Kolkata',
      availability: []
    }
  });
  assert.equal(profileUpdate.status, 200);

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }
  });
  assert.equal(adminLogin.status, 200, 'The configured admin must be able to log in.');
  const pending = await request('/api/admin/mentors?status=pending&limit=50', { cookie: adminLogin.sessionCookie });
  assert.equal(pending.status, 200);
  assert.ok(pending.data.items.some((mentor) => mentor.id === temporaryMentorId));

  const approval = await request(`/api/admin/mentors/${temporaryMentorId}/approve`, {
    method: 'PATCH',
    cookie: adminLogin.sessionCookie
  });
  assert.equal(approval.status, 200, JSON.stringify(approval.data));
  const nowVisible = await request(`/api/mentors/${temporaryMentorId}`, { cookie: learnerLogin.sessionCookie });
  assert.equal(nowVisible.status, 200);
}

async function cleanup() {
  if (!temporaryMentorId) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    const userId = new mongoose.Types.ObjectId(temporaryMentorId);
    await Promise.all([
      MentorProfile.deleteMany({ userId }),
      LearnerProfile.deleteMany({ userId }),
      User.deleteOne({ _id: userId, email: temporaryEmail })
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

  process.stdout.write('Discovery smoke passed: filters, visibility, mentor detail, admin authorization/approval. Temporary profile removed.\n');
})();