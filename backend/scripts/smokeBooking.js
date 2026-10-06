const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const Booking = require('../src/models/Booking');
const FeedbackEvent = require('../src/models/FeedbackEvent');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const bookingIds = [];

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
  if (!bookingIds.length) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    const ids = bookingIds.map((id) => new mongoose.Types.ObjectId(id));
    await Promise.all([
      Booking.deleteMany({ _id: { $in: ids } }),
      FeedbackEvent.deleteMany({ action: 'booked', 'meta.bookingId': { $in: ids } })
    ]);
  } finally {
    await mongoose.disconnect();
  }
}

async function runSmoke() {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'learner01@mentormatch.local', password: 'Demo@12345' }
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));

  const mentorList = await request('/api/mentors?limit=50', { cookie: login.sessionCookie });
  assert.equal(mentorList.status, 200);
  let selected;
  for (const mentor of mentorList.data.items) {
    const slotResponse = await request(`/api/mentors/${mentor.id}/slots`, { cookie: login.sessionCookie });
    assert.equal(slotResponse.status, 200, JSON.stringify(slotResponse.data));
    selected = slotResponse.data.slots.find((slot) => slot.available);
    if (selected) {
      selected.mentorId = mentor.id;
      break;
    }
  }
  assert.ok(selected, 'At least one seeded mentor must have a future slot.');

  const results = await Promise.all(Array.from({ length: 10 }, () => request('/api/bookings', {
    method: 'POST',
    cookie: login.sessionCookie,
    body: { mentorId: selected.mentorId, startTime: selected.startTime }
  })));
  const created = results.filter((result) => result.status === 201);
  const conflicts = results.filter((result) => result.status === 409);
  assert.equal(created.length, 1, `Expected one successful booking, got ${created.length}.`);
  assert.equal(conflicts.length, 9, `Expected nine slot conflicts, got ${conflicts.length}.`);
  bookingIds.push(created[0].data.booking._id);

  const cancel = await request(`/api/bookings/${bookingIds[0]}/cancel`, {
    method: 'PATCH',
    cookie: login.sessionCookie,
    body: { reason: 'Concurrency smoke cleanup.' }
  });
  assert.equal(cancel.status, 200, JSON.stringify(cancel.data));
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

  process.stdout.write('Booking smoke passed: 10 concurrent requests produced one booking and nine conflicts. Temporary booking and feedback removed.\n');
})();