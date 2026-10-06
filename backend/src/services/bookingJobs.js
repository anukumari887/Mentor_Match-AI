const Booking = require('../models/Booking');
const MentorProfile = require('../models/MentorProfile');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../config/logger');
const { sendReviewRequest, sendSessionReminder } = require('./email');

const JOB_INTERVAL_MS = 60 * 1000;
let isRunning = false;
let timer;

async function expirePendingBookings(now = new Date()) {
  if (isRunning) return 0;
  isRunning = true;
  try {
    const expired = await Booking.find({ status: 'pending', expiresAt: { $lte: now } })
      .select('_id mentorId startTime')
      .lean();
    if (!expired.length) return 0;

    const result = await Booking.updateMany(
      { _id: { $in: expired.map((booking) => booking._id) }, status: 'pending', expiresAt: { $lte: now } },
      { $set: { status: 'expired', holdsSlot: false } }
    );

    if (isRedisConnected()) {
      const client = getRedisClient();
      await Promise.all(expired.map((booking) => client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        `lock:slot:${booking.mentorId}:${new Date(booking.startTime).toISOString()}`,
        String(booking._id)
      )));
    }
    return result.modifiedCount;
  } finally {
    isRunning = false;
  }
}

async function completePastBookings(now = new Date()) {
  const due = await Booking.find({ status: 'confirmed', endTime: { $lt: now } })
    .select('_id learnerId mentorId endTime')
    .lean();
  let completedCount = 0;

  for (const booking of due) {
    const completed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'confirmed', endTime: { $lt: now } },
      { $set: { status: 'completed', completedAt: now } },
      { new: true }
    );
    if (!completed) continue;

    await Promise.all([
      Payment.updateOne({ bookingId: booking._id, status: 'paid' }, { $set: { earned: true } }),
      MentorProfile.updateOne({ userId: booking.mentorId }, { $inc: { totalSessions: 1 } })
    ]);
    const learner = await User.findById(booking.learnerId).select('name email').lean();
    if (learner) await sendReviewRequest(completed, learner);
    completedCount++;
  }
  return completedCount;
}

async function sendUpcomingReminders(now = new Date()) {
  const until = new Date(now.getTime() + 60 * 60 * 1000);
  const upcoming = await Booking.find({
    status: 'confirmed',
    reminderSent: false,
    startTime: { $gt: now, $lte: until }
  }).select('_id learnerId mentorId startTime').lean();
  let reminderCount = 0;

  for (const booking of upcoming) {
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'confirmed', reminderSent: false },
      { $set: { reminderSent: true } },
      { new: false }
    );
    if (!claimed) continue;
    const recipients = await User.find({ _id: { $in: [booking.learnerId, booking.mentorId] } })
      .select('name email')
      .lean();
    await Promise.all(recipients.map((recipient) => sendSessionReminder(booking, recipient)));
    reminderCount++;
  }
  return reminderCount;
}

async function runBookingJobs(now = new Date()) {
  await expirePendingBookings(now);
  await completePastBookings(now);
  await sendUpcomingReminders(now);
}

function startBookingJobs() {
  if (timer) return timer;
  timer = setInterval(() => {
    runBookingJobs().catch((error) => logger.error({ message: error.message }, 'Booking jobs failed'));
  }, JOB_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

function stopBookingJobs() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

module.exports = {
  expirePendingBookings,
  completePastBookings,
  sendUpcomingReminders,
  runBookingJobs,
  startBookingJobs,
  stopBookingJobs
};