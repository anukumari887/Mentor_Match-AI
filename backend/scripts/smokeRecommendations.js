const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const User = require('../src/models/User');
const LearnerProfile = require('../src/models/LearnerProfile');
const FeedbackEvent = require('../src/models/FeedbackEvent');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const expectFallback = process.argv.includes('--fallback');
const email = `phase6-smoke-${randomUUID()}@example.test`;
let learnerId;

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
  const sessionCookie = (response.headers.getSetCookie?.() || [response.headers.get('set-cookie')])
    .find((value) => value?.startsWith('token='))?.split(';')[0];
  return { status: response.status, data, sessionCookie };
}

async function cleanup() {
  if (!learnerId) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    await Promise.all([
      FeedbackEvent.deleteMany({ learnerId }),
      LearnerProfile.deleteOne({ userId: learnerId }),
      User.deleteOne({ _id: learnerId, email })
    ]);
  } finally {
    await mongoose.disconnect();
  }
}

async function runSmoke() {
  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Recommendation Smoke Learner', email, password: 'TestPass123!', role: 'learner' }
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.data));
  learnerId = registration.data.user.id;
  const cookie = registration.sessionCookie;

  const profile = await request('/api/profile', {
    method: 'PUT',
    cookie,
    body: {
      goals: 'Learn applied Python machine learning',
      knownSkills: ['JavaScript'],
      wantedSkills: ['Python', 'Machine Learning'],
      level: 'intermediate',
      budgetPerHour: 1000,
      availability: [{ dayOfWeek: 2, startTime: '17:00', endTime: '21:00' }]
    }
  });
  assert.equal(profile.status, 200, JSON.stringify(profile.data));

  const firstStarted = performance.now();
  const first = await request('/api/recommendations?limit=5', { cookie });
  const firstLatency = performance.now() - firstStarted;
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.source, expectFallback ? 'fallback' : 'ml');
  assert.ok(first.data.items.length > 0, 'The seeded mentor catalog should return recommendations.');
  assert.ok(first.data.items[0].reasons.length > 0);

  let cachedLatency;
  if (!expectFallback) {
    const secondStarted = performance.now();
    const second = await request('/api/recommendations?limit=5', { cookie });
    cachedLatency = performance.now() - secondStarted;
    assert.equal(second.status, 200);
    assert.equal(second.data.source, 'ml');
    assert.ok(cachedLatency < 1000, `Expected cached recommendations under 1s, got ${Math.round(cachedLatency)}ms.`);
  }

  return { source: first.data.source, count: first.data.items.length, firstMs: Math.round(firstLatency), cachedMs: Math.round(cachedLatency || 0) };
}

(async () => {
  let result;
  let failure;
  try {
    result = await runSmoke();
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

  const mode = expectFallback ? 'ML fallback' : 'ML recommendations and Redis cache';
  process.stdout.write(`${mode} smoke passed: source=${result.source}, items=${result.count}, first=${result.firstMs}ms, cached=${result.cachedMs}ms. Temporary learner removed.\n`);
})();