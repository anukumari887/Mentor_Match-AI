jest.mock('../src/models/Booking', () => ({
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({ updateOne: jest.fn() }));
jest.mock('../src/models/Payment', () => ({ updateOne: jest.fn() }));
jest.mock('../src/models/User', () => ({ find: jest.fn(), findById: jest.fn() }));
jest.mock('../src/config/redis', () => ({ getRedisClient: jest.fn(), isRedisConnected: jest.fn(() => false) }));
jest.mock('../src/services/email', () => ({ sendReviewRequest: jest.fn(), sendSessionReminder: jest.fn() }));

const Booking = require('../src/models/Booking');
const MentorProfile = require('../src/models/MentorProfile');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const { sendReviewRequest, sendSessionReminder } = require('../src/services/email');
const { completePastBookings, sendUpcomingReminders } = require('../src/services/bookingJobs');

function findResult(value) {
  return { select: () => ({ lean: async () => value }) };
}

describe('Booking lifecycle jobs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes a confirmed booking, credits mentor earnings, and asks the learner for a review', async () => {
    const booking = {
      _id: 'booking-id',
      learnerId: 'learner-id',
      mentorId: 'mentor-id',
      endTime: new Date('2025-01-01T12:00:00.000Z')
    };
    const completed = { ...booking, status: 'completed' };
    Booking.find.mockReturnValue(findResult([booking]));
    Booking.findOneAndUpdate.mockResolvedValue(completed);
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });
    MentorProfile.updateOne.mockResolvedValue({ modifiedCount: 1 });
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ email: 'learner@example.test', name: 'Learner' }) }) });
    sendReviewRequest.mockResolvedValue(undefined);

    const count = await completePastBookings(new Date('2025-01-02T12:00:00.000Z'));

    expect(count).toBe(1);
    expect(Payment.updateOne).toHaveBeenCalledWith({ bookingId: 'booking-id', status: 'paid' }, { $set: { earned: true } });
    expect(MentorProfile.updateOne).toHaveBeenCalledWith({ userId: 'mentor-id' }, { $inc: { totalSessions: 1 } });
    expect(sendReviewRequest).toHaveBeenCalledWith(completed, expect.objectContaining({ email: 'learner@example.test' }));
  });

  it('claims an upcoming reminder once and sends it to both participants', async () => {
    const booking = { _id: 'booking-id', learnerId: 'learner-id', mentorId: 'mentor-id' };
    Booking.find.mockReturnValue(findResult([booking]));
    Booking.findOneAndUpdate.mockResolvedValue(booking);
    User.find.mockReturnValue({
      select: () => ({ lean: async () => [
        { email: 'learner@example.test', name: 'Learner' },
        { email: 'mentor@example.test', name: 'Mentor' }
      ] })
    });
    sendSessionReminder.mockResolvedValue(undefined);

    const count = await sendUpcomingReminders(new Date());

    expect(count).toBe(1);
    expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'booking-id', status: 'confirmed', reminderSent: false },
      { $set: { reminderSent: true } },
      { new: false }
    );
    expect(sendSessionReminder).toHaveBeenCalledTimes(2);
  });
});