const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const Booking = require('../src/models/Booking');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const { completePastBookings } = require('../src/services/bookingJobs');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const mailpitUrl = process.env.MAILPIT_API_URL || 'http://mailpit:8025';
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

async function mailpitMessageIds() {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`);
  if (!response.ok) throw new Error(`Mailpit returned HTTP ${response.status}.`);
  const data = await response.json();
  return new Set((data.messages || []).map((message) => message.ID || message.id));
}

async function cleanup() {
  if (!bookingIds.length) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    const ids = bookingIds.map((id) => new mongoose.Types.ObjectId(id));
    await Promise.all([
      Payment.deleteMany({ bookingId: { $in: ids } }),
      Booking.deleteMany({ _id: { $in: ids } }),
      FeedbackEvent.deleteMany({ action: 'booked', 'meta.bookingId': { $in: ids } })
    ]);
  } finally {
    await mongoose.disconnect();
  }
}

async function runSmoke() {
  if (env.PAYMENT_MODE !== 'mock') throw new Error('Payment smoke requires PAYMENT_MODE=mock.');
  const messagesBefore = await mailpitMessageIds();
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'learner01@mentormatch.local', password: 'Demo@12345' }
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));

  const mentors = await request('/api/mentors?limit=50', { cookie: login.sessionCookie });
  let selection;
  for (const mentor of mentors.data.items) {
    const response = await request(`/api/mentors/${mentor.id}/slots`, { cookie: login.sessionCookie });
    selection = response.data.slots.find((slot) => slot.available);
    if (selection) {
      selection.mentorId = mentor.id;
      break;
    }
  }
  assert.ok(selection, 'A seeded mentor must have an available slot.');

  const created = await request('/api/bookings', {
    method: 'POST',
    cookie: login.sessionCookie,
    body: { mentorId: selection.mentorId, startTime: selection.startTime }
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const bookingId = created.data.booking._id;
  bookingIds.push(bookingId);

  const order = await request('/api/payments/create-order', {
    method: 'POST',
    cookie: login.sessionCookie,
    body: { bookingId }
  });
  assert.equal(order.status, 200, JSON.stringify(order.data));
  assert.equal(order.data.gateway, 'mock');
  assert.equal(order.data.amount, created.data.booking.priceAtBooking * 100);

  const confirmation = await request('/api/payments/mock/confirm', {
    method: 'POST',
    cookie: login.sessionCookie,
    body: { bookingId }
  });
  assert.equal(confirmation.status, 200, JSON.stringify(confirmation.data));
  assert.equal(confirmation.data.payment.status, 'paid');
  assert.equal(confirmation.data.booking.status, 'confirmed');
  assert.equal(confirmation.data.payment.platformFee, Math.round(order.data.amount * 0.15));
  assert.equal(confirmation.data.payment.mentorEarning, order.data.amount - confirmation.data.payment.platformFee);
  const messagesAfterConfirmation = await mailpitMessageIds();
  const confirmationMessages = [...messagesAfterConfirmation].filter((id) => !messagesBefore.has(id));
  assert.equal(confirmationMessages.length, 2, 'Confirmation should send one email to each participant.');

  const repeated = await request('/api/payments/mock/confirm', {
    method: 'POST',
    cookie: login.sessionCookie,
    body: { bookingId }
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.payment.status, 'paid');

  const messagesAfter = await mailpitMessageIds();
  const newMessageIds = [...messagesAfter].filter((id) => !messagesBefore.has(id));
  assert.equal(newMessageIds.length, 2, 'Repeated confirmation must not duplicate participant emails.');

  await mongoose.connect(env.MONGO_URI);
  try {
    const mentor = await User.findById(selection.mentorId).select('email').lean();
    const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await Booking.updateOne(
      { _id: bookingId, status: 'confirmed' },
      { $set: { startTime: pastStart, endTime: new Date(pastStart.getTime() + 60 * 60 * 1000) } }
    );
    assert.equal(await completePastBookings(new Date()), 1);
    const storedPayment = await Payment.findOne({ bookingId });
    const mentorLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: mentor.email, password: 'Demo@12345' }
    });
    assert.equal(mentorLogin.status, 200);
    const earnings = await request('/api/payments/mentor/earnings', { cookie: mentorLogin.sessionCookie });
    assert.equal(earnings.status, 200);
    assert.equal(earnings.data.earned, storedPayment.mentorEarning);
    assert.equal(earnings.data.balance, storedPayment.mentorEarning);
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

  process.stdout.write('Payment smoke passed: mock order, fee split, idempotent confirmation, two Mailpit messages, completed-session earnings. Temporary records removed.\n');
})();