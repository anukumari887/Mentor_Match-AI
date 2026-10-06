const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const FeedbackEvent = require('../models/FeedbackEvent');
const MentorProfile = require('../models/MentorProfile');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { env } = require('../config/env');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../config/logger');
const { bookingsCreatedTotal } = require('../utils/metrics');
const { sendBookingCancellation } = require('../services/email');
const { generateSlots } = require('../services/slots');
const {
  bookingIdSchema,
  createBookingSchema,
  bookingQuerySchema,
  cancelBookingSchema
} = require('../validations/booking.validation');
const { mentorIdSchema } = require('../validations/mentor.validation');
const { AppError } = require('../utils/errors');

function slotLockKey(mentorId, startTime) {
  return `lock:slot:${mentorId}:${new Date(startTime).toISOString()}`;
}

function getIceServers() {
  const stunUrls = env.STUN_URLS.split(',').map((url) => url.trim()).filter(Boolean);
  const iceServers = stunUrls.length ? [{ urls: stunUrls }] : [];
  if (env.TURN_URL) {
    iceServers.push({
      urls: env.TURN_URL.split(',').map((url) => url.trim()).filter(Boolean),
      username: env.TURN_USERNAME,
      credential: env.TURN_CREDENTIAL
    });
  }
  return iceServers;
}

function participantFilter(user) {
  return user.role === 'learner' ? { learnerId: user._id } : { mentorId: user._id };
}

async function acquireSlotLock(key, value) {
  if (!isRedisConnected()) return null;
  try {
    const result = await getRedisClient().set(key, value, 'EX', env.SLOT_LOCK_MINUTES * 60, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.warn({ message: error.message }, 'Redis slot lock failed; MongoDB will enforce booking uniqueness');
    return null;
  }
}

async function releaseSlotLock(key, token) {
  if (!isRedisConnected() || !token) return;
  try {
    await getRedisClient().eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      String(token)
    );
  } catch (error) {
    logger.warn({ message: error.message }, 'Could not release Redis slot lock');
  }
}

async function getMentorSlots(req, res, next) {
  try {
    const { id } = mentorIdSchema.parse(req.params);
    const mentor = await MentorProfile.findOne({ userId: id, approvalStatus: 'approved' }).lean();
    if (!mentor || !(await User.exists({ _id: id, role: 'mentor', isActive: true }))) {
      return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));
    }

    const slots = generateSlots({ availability: mentor.availability, timezone: mentor.timezone });
    const occupied = await Booking.find({
      mentorId: id,
      holdsSlot: true,
      startTime: { $in: slots.map((slot) => new Date(slot.startTime)) }
    }).select('startTime').lean();
    const occupiedStarts = new Set(occupied.map((booking) => new Date(booking.startTime).toISOString()));

    return res.status(200).json({
      timezone: mentor.timezone,
      slots: slots.map((slot) => ({ ...slot, available: !occupiedStarts.has(slot.startTime) }))
    });
  } catch (error) {
    return next(error);
  }
}

async function createBooking(req, res, next) {
  let lockKey;
  let bookingId;
  let lockAcquired = false;
  try {
    const { mentorId, startTime } = createBookingSchema.parse(req.body);
    if (String(req.user._id) === mentorId) {
      return next(new AppError('You cannot book a session with yourself.', 400, 'SELF_BOOKING'));
    }

    const mentor = await MentorProfile.findOne({ userId: mentorId, approvalStatus: 'approved' }).lean();
    const activeMentor = await User.exists({ _id: mentorId, role: 'mentor', isActive: true });
    if (!mentor || !activeMentor) return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));

    const now = new Date();
    const requestedStart = new Date(startTime);
    const validSlot = generateSlots({
      availability: mentor.availability,
      timezone: mentor.timezone,
      now
    }).find((slot) => new Date(slot.startTime).getTime() === requestedStart.getTime());
    if (!validSlot) return next(new AppError('This is not an available booking slot.', 409, 'SLOT_UNAVAILABLE'));

    const pendingCount = await Booking.countDocuments({
      learnerId: req.user._id,
      status: 'pending',
      expiresAt: { $gt: now }
    });
    if (pendingCount >= 3) return next(new AppError('You already have three pending bookings.', 409, 'PENDING_LIMIT'));

    lockKey = slotLockKey(mentorId, validSlot.startTime);
    bookingId = new mongoose.Types.ObjectId();
    const lockToken = String(bookingId);
    if (isRedisConnected()) {
      const lockResult = await acquireSlotLock(lockKey, lockToken);
      lockAcquired = lockResult === true;
      if (lockResult === false) return next(new AppError('This slot was just booked by someone else.', 409, 'SLOT_TAKEN'));
    }

    const expiresAt = new Date(now.getTime() + env.SLOT_LOCK_MINUTES * 60 * 1000);
    const booking = await Booking.create({
      _id: bookingId,
      learnerId: req.user._id,
      mentorId,
      startTime: requestedStart,
      endTime: new Date(validSlot.endTime),
      priceAtBooking: mentor.pricePerHour,
      status: 'pending',
      holdsSlot: true,
      expiresAt
    });

    try {
      await FeedbackEvent.create({ learnerId: req.user._id, mentorId, action: 'booked', meta: { bookingId: booking._id } });
    } catch (error) {
      logger.warn({ message: error.message }, 'Could not record booking feedback event');
    }

    bookingsCreatedTotal.inc();
    return res.status(201).json({ booking });
  } catch (error) {
    if (lockAcquired && lockKey) await releaseSlotLock(lockKey, bookingId);
    if (error.code === 11000) {
      return next(new AppError('This slot was just booked by someone else.', 409, 'SLOT_TAKEN'));
    }
    return next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const { status } = bookingQuerySchema.parse(req.query);
    const filter = participantFilter(req.user);
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .sort({ startTime: 1 })
      .populate('learnerId', 'name')
      .populate('mentorId', 'name')
      .lean();
    return res.status(200).json({ bookings });
  } catch (error) {
    return next(error);
  }
}

async function getBooking(req, res, next) {
  try {
    const { id } = bookingIdSchema.parse(req.params);
    const booking = await Booking.findOne({ _id: id, ...participantFilter(req.user) })
      .populate('learnerId', 'name')
      .populate('mentorId', 'name')
      .lean();
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));
    return res.status(200).json({ booking });
  } catch (error) {
    return next(error);
  }
}

async function getRoomDetails(req, res, next) {
  try {
    const { id } = bookingIdSchema.parse(req.params);
    const booking = await Booking.findOne({ _id: id, ...participantFilter(req.user) }).lean();
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));

    const opensAt = new Date(new Date(booking.startTime).getTime() - 10 * 60 * 1000);
    const closesAt = new Date(new Date(booking.endTime).getTime() + 15 * 60 * 1000);
    const now = new Date();
    const canJoin = booking.status === 'confirmed' && now >= opensAt && now <= closesAt;
    return res.status(200).json({
      canJoin,
      opensAt: opensAt.toISOString(),
      closesAt: closesAt.toISOString(),
      iceServers: getIceServers()
    });
  } catch (error) {
    return next(error);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { id } = bookingIdSchema.parse(req.params);
    const { reason } = cancelBookingSchema.parse(req.body || {});
    const now = new Date();
    const ownership = { _id: id, ...participantFilter(req.user) };
    const existing = await Booking.findOne(ownership);
    if (!existing) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));
    if (!['pending', 'confirmed'].includes(existing.status) || !existing.holdsSlot || existing.startTime <= now) {
      return next(new AppError('This booking can no longer be cancelled.', 409, 'BOOKING_NOT_CANCELLABLE'));
    }

    const booking = await Booking.findOneAndUpdate(
      {
        ...ownership,
        status: existing.status,
        holdsSlot: true,
        startTime: { $gt: now }
      },
      { $set: { status: 'cancelled', holdsSlot: false, cancelledAt: now, cancelledBy: req.user.role, cancelReason: reason || '' } },
      { new: true }
    );
    if (!booking) return next(new AppError('Only an active pending booking can be cancelled here.', 409, 'BOOKING_NOT_CANCELLABLE'));

    if (existing.status === 'confirmed') {
      const payment = await Payment.findOne({ bookingId: existing._id, status: 'paid' });
      if (payment) {
        const hoursUntilStart = (new Date(existing.startTime).getTime() - now.getTime()) / (60 * 60 * 1000);
        const refundDue = req.user.role === 'mentor' || hoursUntilStart >= env.FREE_CANCEL_HOURS;
        await Payment.updateOne(
          { _id: payment._id, status: 'paid' },
          refundDue ? { $set: { status: 'refund_due' } } : { $set: { earned: true } }
        );
      }
      const recipientId = req.user.role === 'learner' ? existing.mentorId : existing.learnerId;
      await sendBookingCancellation(booking, recipientId);
    }

    await releaseSlotLock(slotLockKey(booking.mentorId, booking.startTime), booking._id);
    return res.status(200).json({ booking });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMentorSlots,
  createBooking,
  listBookings,
  getBooking,
  getRoomDetails,
  cancelBooking,
  slotLockKey,
  acquireSlotLock,
  releaseSlotLock
};