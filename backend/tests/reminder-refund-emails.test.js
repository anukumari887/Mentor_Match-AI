jest.mock('../src/config/database', () => ({
  isMongoConnected: jest.fn(() => true),
  connectMongoWithRetry: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  isRedisConnected: jest.fn(() => false),
  connectRedisWithRetry: jest.fn(),
  getRedisClient: jest.fn()
}));

jest.mock('../src/models/Booking', () => ({
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../src/models/Payment', () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../src/models/User', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({
  updateOne: jest.fn()
}));

jest.mock('../src/services/email', () => ({
  sendSessionReminder: jest.fn(),
  sendRefundPendingEmail: jest.fn(),
  sendRefundCompletedEmail: jest.fn(),
  sendChatMessageEmail: jest.fn()
}));

const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const {
  sendSessionReminder,
  sendRefundPendingEmail,
  sendRefundCompletedEmail,
  sendChatMessageEmail
} = require('../src/services/email');
const { send24hReminders } = require('../src/services/bookingJobs');

function findResult(value) {
  return { select: () => ({ lean: async () => value }) };
}

describe('Refund, Reminder and Chat Email Dispatch Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Reminders (24h and 1h jobs)', () => {
    it('sends 24-hour reminder to BOTH participants exactly once and marks reminder24hSent atomically', async () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const start = new Date('2026-10-15T10:00:00.000Z'); // exactly 24h away
      const created = new Date('2026-10-10T10:00:00.000Z'); // created 4 days ago (>24h lead)

      const booking = {
        _id: 'booking-24h',
        learnerId: 'learner-id',
        mentorId: 'mentor-id',
        startTime: start,
        endTime: new Date('2026-10-15T11:00:00.000Z'),
        createdAt: created,
        status: 'confirmed',
        reminder24hSent: false
      };

      Booking.find.mockReturnValue(findResult([booking]));
      Booking.findOneAndUpdate.mockResolvedValue(booking);
      User.findById.mockImplementation((id) => {
        if (id === 'learner-id') {
          return { select: () => ({ lean: async () => ({ _id: 'learner-id', email: 'learner@test.com', name: 'Learner User' }) }) };
        }
        return { select: () => ({ lean: async () => ({ _id: 'mentor-id', email: 'mentor@test.com', name: 'Mentor User' }) }) };
      });

      const count = await send24hReminders(now);
      expect(count).toBe(1);
      expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'booking-24h', status: 'confirmed', reminder24hSent: false },
        { $set: { reminder24hSent: true } },
        { new: false }
      );
      // Both people receive the reminder
      expect(sendSessionReminder).toHaveBeenCalledTimes(2);
      expect(sendSessionReminder).toHaveBeenCalledWith(
        booking,
        expect.objectContaining({ email: 'learner@test.com' }),
        'Mentor User',
        24
      );
      expect(sendSessionReminder).toHaveBeenCalledWith(
        booking,
        expect.objectContaining({ email: 'mentor@test.com' }),
        'Learner User',
        24
      );
    });

    it('does NOT send 24h reminder if booking was created less than 24h before start', async () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const start = new Date('2026-10-15T10:00:00.000Z');
      const created = new Date('2026-10-14T22:00:00.000Z'); // created 12 hours before start (< 24h lead)

      const booking = {
        _id: 'booking-short-lead',
        learnerId: 'learner-id',
        mentorId: 'mentor-id',
        startTime: start,
        createdAt: created,
        status: 'confirmed',
        reminder24hSent: false
      };

      Booking.find.mockReturnValue(findResult([booking]));

      const count = await send24hReminders(now);
      expect(count).toBe(0);
      expect(sendSessionReminder).not.toHaveBeenCalled();
    });

    it('does NOT send reminder if atomic claim returns null (simulating concurrent worker run)', async () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const booking = {
        _id: 'booking-already-claimed',
        learnerId: 'learner-id',
        mentorId: 'mentor-id',
        startTime: new Date('2026-10-15T10:00:00.000Z'),
        createdAt: new Date('2026-10-10T10:00:00.000Z'),
        status: 'confirmed'
      };

      Booking.find.mockReturnValue(findResult([booking]));
      Booking.findOneAndUpdate.mockResolvedValue(null); // atomic claim lost

      const count = await send24hReminders(now);
      expect(count).toBe(0);
      expect(sendSessionReminder).not.toHaveBeenCalled();
    });
  });

  describe('Refund Emails (pending and completed)', () => {
    it('sends refund pending email only once via atomic findOneAndUpdate and only to the learner', async () => {
      Payment.findOneAndUpdate.mockResolvedValue({
        _id: 'payment-1',
        bookingId: 'booking-1',
        learnerId: 'learner-id',
        amount: 150000,
        refundDueEmailSentAt: new Date()
      });
      User.findById.mockReturnValue({
        select: () => ({
          lean: async () => ({ email: 'learner@test.com', name: 'Learner User' })
        })
      });

      // Atomic claim simulates success on first attempt
      const claimed = await Payment.findOneAndUpdate(
        { bookingId: 'booking-1', refundDueEmailSentAt: null },
        { $set: { refundDueEmailSentAt: new Date() } },
        { new: true }
      );
      expect(claimed).toBeTruthy();

      await sendRefundPendingEmail({
        learner: { email: 'learner@test.com', name: 'Learner User' },
        amount: 150000,
        bookingDate: '15 October 2026'
      });
      expect(sendRefundPendingEmail).toHaveBeenCalledTimes(1);

      // Simulating repeated event: atomic claim returns null
      Payment.findOneAndUpdate.mockResolvedValueOnce(null);
      const secondClaim = await Payment.findOneAndUpdate(
        { bookingId: 'booking-1', refundDueEmailSentAt: null },
        { $set: { refundDueEmailSentAt: new Date() } },
        { new: true }
      );
      expect(secondClaim).toBeNull();
    });

    it('sends refund completed email only once via atomic findOneAndUpdate and only to the learner', async () => {
      Payment.findOneAndUpdate.mockResolvedValue({
        _id: 'payment-1',
        bookingId: 'booking-1',
        learnerId: 'learner-id',
        amount: 150000,
        refundedEmailSentAt: new Date()
      });

      const claimed = await Payment.findOneAndUpdate(
        { bookingId: 'booking-1', refundedEmailSentAt: null },
        { $set: { refundedEmailSentAt: new Date() } },
        { new: true }
      );
      expect(claimed).toBeTruthy();

      await sendRefundCompletedEmail({
        learner: { email: 'learner@test.com', name: 'Learner User' },
        amount: 150000,
        bookingDate: '15 October 2026',
        refundReference: 'RFND_12345'
      });
      expect(sendRefundCompletedEmail).toHaveBeenCalledTimes(1);

      // Simulating repeated admin call: atomic claim returns null
      Payment.findOneAndUpdate.mockResolvedValueOnce(null);
      const secondClaim = await Payment.findOneAndUpdate(
        { bookingId: 'booking-1', refundedEmailSentAt: null },
        { $set: { refundedEmailSentAt: new Date() } },
        { new: true }
      );
      expect(secondClaim).toBeNull();
    });
  });

  describe('Chat notification emails', () => {
    it('escapes user content and limits preview in chat email', async () => {
      const maliciousScript = '<script>alert("hack")</script> & Hello world!';
      await sendChatMessageEmail({
        recipient: { email: 'mentor@test.com', name: 'Mentor User' },
        senderName: 'Learner <BadTag>',
        messageText: maliciousScript,
        conversationId: 'conv-123'
      });

      expect(sendChatMessageEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: { email: 'mentor@test.com', name: 'Mentor User' },
          messageText: maliciousScript,
          conversationId: 'conv-123'
        })
      );
    });
  });
});
