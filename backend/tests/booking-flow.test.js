jest.mock('../src/models/Booking', () => ({
  create: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('../src/models/FeedbackEvent', () => ({ create: jest.fn() }));
jest.mock('../src/models/MentorProfile', () => ({ findOne: jest.fn() }));
jest.mock('../src/models/User', () => ({ exists: jest.fn() }));
jest.mock('../src/models/Payment', () => ({ findOne: jest.fn(), updateOne: jest.fn() }));
jest.mock('../src/services/email', () => ({ sendBookingCancellation: jest.fn() }));
jest.mock('../src/services/slots', () => ({ generateSlots: jest.fn() }));
jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn()
}));
jest.mock('../src/config/env', () => ({ env: {
  SLOT_LOCK_MINUTES: 10,
  MIN_BOOKING_LEAD_HOURS: 2,
  FREE_CANCEL_HOURS: 24,
  STUN_URLS: 'stun:stun.example.test:19302',
  TURN_URL: '',
  TURN_USERNAME: '',
  TURN_CREDENTIAL: ''
} }));

const Booking = require('../src/models/Booking');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const MentorProfile = require('../src/models/MentorProfile');
const User = require('../src/models/User');
const Payment = require('../src/models/Payment');
const { sendBookingCancellation } = require('../src/services/email');
const { generateSlots } = require('../src/services/slots');
const { getRedisClient, isRedisConnected } = require('../src/config/redis');
const bookingController = require('../src/controllers/booking.controller');
const { expirePendingBookings } = require('../src/services/bookingJobs');

const learnerId = '507f1f77bcf86cd799439011';
const mentorId = '507f1f77bcf86cd799439012';
const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const slot = { startTime, endTime: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(), timezone: 'Asia/Kolkata' };

function createResponse() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

function setupAvailableMentor() {
  MentorProfile.findOne.mockReturnValue({
    lean: jest.fn().mockResolvedValue({
      userId: mentorId,
      availability: [],
      timezone: 'Asia/Kolkata',
      pricePerHour: 900
    })
  });
  User.exists.mockResolvedValue(true);
  generateSlots.mockReturnValue([slot]);
  Booking.countDocuments.mockResolvedValue(0);
  FeedbackEvent.create.mockResolvedValue({});
  Booking.create.mockResolvedValue({ _id: 'booking-id', startTime: new Date(startTime) });
}

describe('Booking creation and expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isRedisConnected.mockReturnValue(false);
    getRedisClient.mockReturnValue({ set: jest.fn(), del: jest.fn() });
  });

  it('creates a pending booking when Redis is unavailable and MongoDB is the guard', async () => {
    setupAvailableMentor();
    const req = { body: { mentorId, startTime }, user: { _id: learnerId, role: 'learner' } };
    const res = createResponse();
    const next = jest.fn();

    await bookingController.createBooking(req, res, next);

    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      learnerId,
      mentorId,
      status: 'pending',
      holdsSlot: true,
      priceAtBooking: 900
    }));
    expect(FeedbackEvent.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'booked' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to MongoDB when Redis SET errors', async () => {
    setupAvailableMentor();
    isRedisConnected.mockReturnValue(true);
    getRedisClient.mockReturnValue({ set: jest.fn().mockRejectedValue(new Error('Redis unavailable')) });
    const res = createResponse();
    const next = jest.fn();

    await bookingController.createBooking(
      { body: { mentorId, startTime }, user: { _id: learnerId, role: 'learner' } },
      res,
      next
    );

    expect(Booking.create).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a slot already held in Redis', async () => {
    setupAvailableMentor();
    isRedisConnected.mockReturnValue(true);
    getRedisClient.mockReturnValue({ set: jest.fn().mockResolvedValue(null) });
    const next = jest.fn();

    await bookingController.createBooking(
      { body: { mentorId, startTime }, user: { _id: learnerId, role: 'learner' } },
      createResponse(),
      next
    );

    expect(Booking.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, code: 'SLOT_TAKEN' }));
  });

  it('rejects a client timestamp that is not a generated slot', async () => {
    setupAvailableMentor();
    generateSlots.mockReturnValue([]);
    const next = jest.fn();

    await bookingController.createBooking(
      { body: { mentorId, startTime }, user: { _id: learnerId, role: 'learner' } },
      createResponse(),
      next
    );

    expect(Booking.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, code: 'SLOT_UNAVAILABLE' }));
  });

  it('expires pending holds and frees their database slot state', async () => {
    const expired = [{ _id: 'booking-id', mentorId, startTime: new Date(startTime) }];
    Booking.find.mockReturnValue({
      select: () => ({ lean: async () => expired })
    });
    Booking.updateMany.mockResolvedValue({ modifiedCount: 1 });

    const result = await expirePendingBookings(new Date());

    expect(result).toBe(1);
    expect(Booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', expiresAt: expect.any(Object) }),
      { $set: { status: 'expired', holdsSlot: false } }
    );
  });

  it('returns participant room timing and ICE configuration for a joinable booking', async () => {
    Booking.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439014',
        learnerId,
        mentorId,
        status: 'confirmed',
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        endTime: new Date(Date.now() + 55 * 60 * 1000)
      })
    });
    const res = createResponse();

    await bookingController.getRoomDetails(
      { params: { id: '507f1f77bcf86cd799439014' }, user: { _id: learnerId, role: 'learner' } },
      res,
      jest.fn()
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      canJoin: true,
      iceServers: [{ urls: ['stun:stun.example.test:19302'] }],
      opensAt: expect.any(String),
      closesAt: expect.any(String)
    }));
  });

  it('marks a late learner cancellation as earned by the mentor', async () => {
    const existing = {
      _id: '507f1f77bcf86cd799439014',
      learnerId,
      mentorId,
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'confirmed',
      holdsSlot: true
    };
    Booking.findOne.mockResolvedValue(existing);
    Booking.findOneAndUpdate.mockResolvedValue({ ...existing, status: 'cancelled', holdsSlot: false });
    Payment.findOne.mockResolvedValue({ _id: 'payment-id', status: 'paid' });
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const next = jest.fn();

    await bookingController.cancelBooking(
      { params: { id: '507f1f77bcf86cd799439014' }, body: { reason: 'Schedule changed' }, user: { _id: learnerId, role: 'learner' } },
      createResponse(),
      next
    );

    expect(Payment.updateOne).toHaveBeenCalledWith(
      { _id: 'payment-id', status: 'paid' },
      { $set: { earned: true } }
    );
    expect(sendBookingCancellation).toHaveBeenCalledWith(expect.any(Object), mentorId);
    expect(next).not.toHaveBeenCalled();
  });

  it('marks an on-time learner cancellation as refund due', async () => {
    const existing = {
      _id: '507f1f77bcf86cd799439014',
      learnerId,
      mentorId,
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'confirmed',
      holdsSlot: true
    };
    Booking.findOne.mockResolvedValue(existing);
    Booking.findOneAndUpdate.mockResolvedValue({ ...existing, status: 'cancelled', holdsSlot: false });
    Payment.findOne.mockResolvedValue({ _id: 'payment-id', status: 'paid' });
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await bookingController.cancelBooking(
      { params: { id: existing._id }, body: {}, user: { _id: learnerId, role: 'learner' } },
      createResponse(),
      jest.fn()
    );

    expect(Payment.updateOne).toHaveBeenCalledWith(
      { _id: 'payment-id', status: 'paid' },
      { $set: { status: 'refund_due' } }
    );
  });

  it('marks a confirmed mentor cancellation as refund due', async () => {
    const existing = {
      _id: '507f1f77bcf86cd799439014',
      learnerId,
      mentorId,
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'confirmed',
      holdsSlot: true
    };
    Booking.findOne.mockResolvedValue(existing);
    Booking.findOneAndUpdate.mockResolvedValue({ ...existing, status: 'cancelled', holdsSlot: false });
    Payment.findOne.mockResolvedValue({ _id: 'payment-id', status: 'paid' });
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const next = jest.fn();

    await bookingController.cancelBooking(
      { params: { id: '507f1f77bcf86cd799439014' }, body: {}, user: { _id: mentorId, role: 'mentor' } },
      createResponse(),
      next
    );

    expect(Payment.updateOne).toHaveBeenCalledWith(
      { _id: 'payment-id', status: 'paid' },
      { $set: { status: 'refund_due' } }
    );
    expect(sendBookingCancellation).toHaveBeenCalledWith(expect.any(Object), learnerId);
    expect(next).not.toHaveBeenCalled();
  });
});