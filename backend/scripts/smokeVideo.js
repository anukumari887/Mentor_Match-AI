const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { io: connectSocket } = require('socket.io-client');
const { env } = require('../src/config/env');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
let bookingId;
const sockets = [];

async function login(email) {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Demo@12345' })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const cookie = (response.headers.getSetCookie?.() || [response.headers.get('set-cookie')])
    .find((value) => value?.startsWith('token='))?.split(';')[0];
  assert.ok(cookie, 'Login should return the HTTP-only session cookie.');
  return cookie;
}

function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = connectSocket(apiUrl, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
      extraHeaders: { Cookie: cookie }
    });
    sockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function join(socket) {
  return new Promise((resolve) => socket.emit('join-room', { bookingId: String(bookingId) }, resolve));
}

async function cleanup() {
  for (const socket of sockets) socket.disconnect();
  if (!bookingId) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    await Booking.deleteOne({ _id: bookingId });
  } finally {
    await mongoose.disconnect();
  }
}

async function runSmoke() {
  await mongoose.connect(env.MONGO_URI);
  const [learner, mentor] = await Promise.all([
    User.findOne({ email: 'learner01@mentormatch.local', role: 'learner' }),
    User.findOne({ email: 'mentor01@mentormatch.local', role: 'mentor' })
  ]);
  assert.ok(learner && mentor, 'Run the demo seed before the video smoke.');

  const now = Date.now();
  const booking = await Booking.create({
    learnerId: learner._id,
    mentorId: mentor._id,
    startTime: new Date(now - 60 * 1000),
    endTime: new Date(now + 59 * 60 * 1000),
    priceAtBooking: 500,
    status: 'confirmed',
    holdsSlot: true,
    completedAt: undefined
  });
  bookingId = booking._id;

  const [learnerCookie, mentorCookie] = await Promise.all([
    login('learner01@mentormatch.local'),
    login('mentor01@mentormatch.local')
  ]);
  const [learnerSocket, mentorSocket] = await Promise.all([connect(learnerCookie), connect(mentorCookie)]);
  const peerJoined = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Mentor did not receive peer-joined.')), 5000);
    learnerSocket.once('peer-joined', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

  assert.deepEqual(await join(learnerSocket), { ok: true, bookingId: String(bookingId) });
  assert.deepEqual(await join(mentorSocket), { ok: true, bookingId: String(bookingId) });
  assert.equal(String((await peerJoined).userId), String(mentor._id));

  const signalReceived = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Peer signaling message was not relayed.')), 5000);
    mentorSocket.once('signal', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
  learnerSocket.emit('signal', { bookingId: String(bookingId), type: 'offer', data: { sdp: 'smoke-offer' } });
  assert.deepEqual(await signalReceived, {
    type: 'offer',
    data: { sdp: 'smoke-offer' },
    fromUserId: String(learner._id)
  });

  const third = await connect(learnerCookie);
  const roomError = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Third participant was not rejected.')), 5000);
    third.once('room-error', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
  assert.deepEqual(await join(third), { ok: false, error: { code: 'ROOM_FULL', message: 'This session already has two participants.' } });
  assert.equal((await roomError).code, 'ROOM_FULL');
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

  process.stdout.write('Video smoke passed: HTTP-only-cookie Socket.IO auth, two participants, peer join, scoped offer relay, third-participant rejection. Temporary booking removed.\n');
})();