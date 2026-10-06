const { getChatAccess } = require('../src/services/chatAccess');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');

jest.mock('../src/config/env', () => ({
  env: {
    CHAT_VALIDITY_DAYS: 7
  }
}));
jest.mock('../src/models/User');
jest.mock('../src/models/Booking');

describe('Chat access rules (getChatAccess)', () => {
  const learnerId = '507f1f77bcf86cd799439011';
  const mentorId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation((id) => ({
      select: () => ({
        lean: () => Promise.resolve({
          _id: id,
          isActive: true,
          role: id === learnerId ? 'learner' : 'mentor'
        })
      })
    }));
  });

  it('allowed with a confirmed booking', async () => {
    const endTime = new Date(Date.now() + 60 * 60 * 1000);
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'b1', learnerId, mentorId, status: 'confirmed', endTime }
          ])
        })
      })
    });

    const access = await getChatAccess(learnerId, mentorId);
    expect(access.allowed).toBe(true);
    expect(access.validUntil).toEqual(new Date(endTime.getTime() + 7 * 24 * 60 * 60 * 1000));
    expect(access.reason).toBeNull();
  });

  it('allowed with a completed booking until endTime + CHAT_VALIDITY_DAYS and refused one minute after', async () => {
    // 5 days ago completed => still within 7 days
    const endTime = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'b1', learnerId, mentorId, status: 'completed', endTime }
          ])
        })
      })
    });

    const accessValid = await getChatAccess(learnerId, mentorId);
    expect(accessValid.allowed).toBe(true);

    // Refused 1 minute after validity expires
    const expiredEndTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 60 * 1000);
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'b1', learnerId, mentorId, status: 'completed', endTime: expiredEndTime }
          ])
        })
      })
    });

    const accessExpired = await getChatAccess(learnerId, mentorId);
    expect(accessExpired.allowed).toBe(false);
    expect(accessExpired.reason).toBe('CHAT_EXPIRED');
  });

  it('refused with only pending, expired, or cancelled bookings', async () => {
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([])
        })
      })
    });

    const access = await getChatAccess(learnerId, mentorId);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe('NO_VALID_BOOKING');
  });

  it('a new booking extends validity', async () => {
    const oldEndTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const newEndTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: 'b2', learnerId, mentorId, status: 'confirmed', endTime: newEndTime },
            { _id: 'b1', learnerId, mentorId, status: 'completed', endTime: oldEndTime }
          ])
        })
      })
    });

    const access = await getChatAccess(learnerId, mentorId);
    expect(access.allowed).toBe(true);
    expect(access.validUntil).toEqual(new Date(newEndTime.getTime() + 7 * 24 * 60 * 60 * 1000));
  });

  it('a booking that becomes cancelled or refunded removes access at once', async () => {
    // If only cancelled booking exists in database, query finds 0 valid bookings
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([])
        })
      })
    });

    const access = await getChatAccess(learnerId, mentorId);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe('NO_VALID_BOOKING');
  });

  it('inactive accounts cannot access chat', async () => {
    User.findById.mockImplementation((id) => ({
      select: () => ({
        lean: () => Promise.resolve({
          _id: id,
          isActive: false,
          role: 'learner'
        })
      })
    }));

    const access = await getChatAccess(learnerId, mentorId);
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe('USER_INACTIVE');
  });
});
