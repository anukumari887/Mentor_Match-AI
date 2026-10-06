const Booking = require('../models/Booking');
const User = require('../models/User');
const { env } = require('../config/env');

/**
 * Calculates chat access between learner and mentor dynamically from database bookings.
 * 
 * @param {string|import('mongoose').Types.ObjectId} learnerId 
 * @param {string|import('mongoose').Types.ObjectId} mentorId 
 * @param {Date} [now]
 * @returns {Promise<{ allowed: boolean, validUntil: Date | null, reason: string | null }>}
 */
async function getChatAccess(learnerId, mentorId, now = new Date()) {
  const lId = learnerId?._id || learnerId;
  const mId = mentorId?._id || mentorId;

  const [learner, mentor] = await Promise.all([
    User.findById(lId).select('isActive role').lean(),
    User.findById(mId).select('isActive role').lean()
  ]);

  if (!learner || !learner.isActive || !mentor || !mentor.isActive) {
    return {
      allowed: false,
      validUntil: null,
      reason: 'USER_INACTIVE'
    };
  }

  // Find all confirmed or completed bookings between learner and mentor
  const validBookings = await Booking.find({
    learnerId: lId,
    mentorId: mId,
    status: { $in: ['confirmed', 'completed'] }
  })
    .sort({ endTime: -1 })
    .select('endTime status')
    .lean();

  if (!validBookings || validBookings.length === 0) {
    return {
      allowed: false,
      validUntil: null,
      reason: 'NO_VALID_BOOKING'
    };
  }

  // validUntil = latest endTime + CHAT_VALIDITY_DAYS
  const latestEndTime = new Date(validBookings[0].endTime).getTime();
  const validityDays = Number(env.CHAT_VALIDITY_DAYS || 7);
  const validUntilMs = latestEndTime + validityDays * 24 * 60 * 60 * 1000;
  const validUntil = new Date(validUntilMs);

  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (currentTime > validUntilMs) {
    return {
      allowed: false,
      validUntil,
      reason: 'CHAT_EXPIRED'
    };
  }

  return {
    allowed: true,
    validUntil,
    reason: null
  };
}

module.exports = {
  getChatAccess
};
