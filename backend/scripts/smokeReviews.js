const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { env } = require('../src/config/env');
const Booking = require('../src/models/Booking');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const LearnerProfile = require('../src/models/LearnerProfile');
const MentorProfile = require('../src/models/MentorProfile');
const Review = require('../src/models/Review');
const User = require('../src/models/User');

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:5000';
const email = `phase7-smoke-${randomUUID()}@example.test`;
let learnerId;
let mentorId;
let bookingId;
let originalRating;

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

async function matchingKeys(redis, pattern) {
  let cursor = '0';
  const matches = [];
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    matches.push(...keys);
  } while (cursor !== '0');
  return matches;
}

async function redisKeys(pattern) {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    return await matchingKeys(redis, pattern);
  } finally {
    if (redis.status !== 'end') await redis.quit();
  }
}

async function cleanup() {
  if (!learnerId) return;
  await mongoose.connect(env.MONGO_URI);
  try {
    if (bookingId) {
      await Promise.all([
        Review.deleteOne({ bookingId }),
        Booking.deleteOne({ _id: bookingId }),
        FeedbackEvent.deleteMany({ 'meta.bookingId': bookingId })
      ]);
    }
    await Promise.all([
      FeedbackEvent.deleteMany({ learnerId }),
      LearnerProfile.deleteOne({ userId: learnerId }),
      User.deleteOne({ _id: learnerId, email })
    ]);
    if (mentorId && originalRating) {
      await MentorProfile.updateOne({ userId: mentorId }, { $set: originalRating });
    }
  } finally {
    await mongoose.disconnect();
  }

  const keys = await redisKeys(`rec:${learnerId}:*`);
  if (keys.length) {
    const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      await redis.connect();
      await redis.del(...keys);
    } finally {
      if (redis.status !== 'end') await redis.quit();
    }
  }
}

async function runSmoke() {
  await mongoose.connect(env.MONGO_URI);
  const mentor = await User.findOne({ email: 'mentor01@mentormatch.local', role: 'mentor' });
  assert.ok(mentor, 'Run the seed command before the review smoke.');
  mentorId = mentor._id;
  const mentorProfile = await MentorProfile.findOne({ userId: mentorId }).lean();
  originalRating = { ratingAvg: mentorProfile.ratingAvg, ratingCount: mentorProfile.ratingCount };

  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Review Smoke Learner', email, password: 'TestPass123!', role: 'learner' }
  });
  assert.equal(registration.status, 201, JSON.stringify(registration.data));
  learnerId = registration.data.user.id;
  const cookie = registration.sessionCookie;

  const profile = await request('/api/profile', {
    method: 'PUT',
    cookie,
    body: {
      goals: 'Learn Python and machine learning',
      wantedSkills: ['Python', 'Machine Learning'],
      knownSkills: [],
      level: 'beginner',
      budgetPerHour: 1000,
      availability: []
    }
  });
  assert.equal(profile.status, 200);
  const recommendations = await request('/api/recommendations', { cookie });
  assert.equal(recommendations.status, 200);
  assert.ok((await redisKeys(`rec:${learnerId}:*`)).length > 0);

  const startTime = new Date('2020-01-01T00:00:00.000Z');
  const booking = await Booking.create({
    learnerId,
    mentorId,
    startTime,
    endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
    priceAtBooking: 900,
    status: 'completed',
    holdsSlot: true,
    completedAt: new Date(startTime.getTime() + 60 * 60 * 1000),
    hasReview: false
  });
  bookingId = booking._id;

  const submitted = await request('/api/reviews', {
    method: 'POST',
    cookie,
    body: { bookingId: String(bookingId), rating: 5, comment: 'A useful, practical session.' }
  });
  assert.equal(submitted.status, 201, JSON.stringify(submitted.data));

  const duplicate = await request('/api/reviews', {
    method: 'POST',
    cookie,
    body: { bookingId: String(bookingId), rating: 5, comment: 'Second attempt.' }
  });
  assert.equal(duplicate.status, 409);

  const updatedProfile = await MentorProfile.findOne({ userId: mentorId }).lean();
  assert.equal(updatedProfile.ratingCount, originalRating.ratingCount + 1);
  assert.equal(updatedProfile.ratingAvg, (originalRating.ratingAvg * originalRating.ratingCount + 5) / (originalRating.ratingCount + 1));

  const reviewList = await request(`/api/mentors/${mentorId}/reviews`, { cookie });
  assert.equal(reviewList.status, 200);
  assert.ok(reviewList.data.reviews.some((review) => review.id === String(submitted.data.review._id)));
  assert.equal((await redisKeys(`rec:${learnerId}:*`)).length, 0);
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

  process.stdout.write('Review smoke passed: eligible completed session, duplicate rejection, rating recompute, review list, and cache invalidation. Temporary records removed and seeded rating restored.\n');
})();