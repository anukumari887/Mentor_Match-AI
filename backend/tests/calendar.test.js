const { generateIcs } = require('../src/utils/calendar');

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
  findById: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../src/models/Payment', () => ({
  find: jest.fn(() => ({
    select: () => ({
      lean: async () => []
    })
  }))
}));

jest.mock('../src/models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../src/models/EmailVerification', () => ({
  deleteMany: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/token');

function makeAuthCookie(userId, role = 'learner') {
  const token = generateToken({ id: userId, role, tv: 0 });
  return `token=${token}`;
}

describe('Calendar RFC 5545 generator and API', () => {
  beforeEach(() => {
    User.findById.mockImplementation((id) => Promise.resolve({
      _id: id,
      name: 'Test User',
      role: 'learner',
      isActive: true,
      tokenVersion: 0,
      emailVerified: true
    }));
  });

  const sampleBooking = {
    _id: '65f1a2b3c4d5e6f7a8b9c0d1',
    learnerId: 'learner-user-id',
    mentorId: 'mentor-user-id',
    startTime: new Date('2026-10-15T10:00:00.000Z'),
    endTime: new Date('2026-10-15T11:00:00.000Z'),
    status: 'confirmed'
  };

  it('generates a strictly valid RFC 5545 .ics string', () => {
    const ics = generateIcs({
      booking: sampleBooking,
      otherUserName: 'Dr. Jane Smith, PhD; Expert',
      appUrl: 'http://localhost:3000'
    });

    // Uses CRLF line endings
    expect(ics).toContain('\r\n');
    const lines = ics.split('\r\n');

    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('PRODID:-//Mentor-Match AI//Session Calendar//EN');
    expect(lines).toContain('CALSCALE:GREGORIAN');
    expect(lines).toContain('METHOD:PUBLISH');
    expect(lines).toContain('BEGIN:VEVENT');

    // UID matches bookingId@host
    expect(lines).toContain('UID:65f1a2b3c4d5e6f7a8b9c0d1@localhost');

    // Times are in UTC format YYYYMMDDTHHMMSSZ
    expect(lines).toContain('DTSTART:20261015T100000Z');
    expect(lines).toContain('DTEND:20261015T110000Z');

    // Escapes special characters: comma, semicolon, backslash
    expect(ics).toContain('Dr. Jane Smith\\, PhD\\; Expert');

    // Join link in URL and DESCRIPTION
    expect(ics).toContain('http://localhost:3000/session/65f1a2b3c4d5e6f7a8b9c0d1');

    // Alarm 15 minutes before
    expect(lines).toContain('BEGIN:VALARM');
    expect(lines).toContain('TRIGGER:-PT15M');
    expect(lines).toContain('ACTION:DISPLAY');
    expect(lines).toContain('END:VALARM');
    expect(lines).toContain('END:VEVENT');
    expect(lines).toContain('END:VCALENDAR');

    // No emails in the file
    expect(ics).not.toContain('@mentormatch.local');
    expect(ics).not.toContain('mailto:');

    // Line folding: no line should exceed 75 bytes (excluding CRLF)
    lines.forEach((line) => {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    });
  });

  it('downloads .ics with correct headers and safe filename for participants', async () => {
    Booking.findOne.mockReturnValue({
      populate: () => ({
        populate: () => ({
          lean: async () => ({
            ...sampleBooking,
            learnerId: { _id: 'learner-user-id', name: 'Learner User' },
            mentorId: { _id: 'mentor-user-id', name: 'Mentor User' }
          })
        })
      })
    });

    const cookie = makeAuthCookie('learner-user-id', 'learner');
    const res = await request(app)
      .get(`/api/bookings/${sampleBooking._id}/calendar.ics`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="${sampleBooking._id}.ics"`
    );
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('UID:65f1a2b3c4d5e6f7a8b9c0d1@localhost');
  });

  it('refuses .ics download with 404 for strangers (IDOR prevention)', async () => {
    Booking.findOne.mockReturnValue({
      populate: () => ({
        populate: () => ({
          lean: async () => null
        })
      })
    });

    const strangerCookie = makeAuthCookie('stranger-user-id', 'learner');
    const res = await request(app)
      .get(`/api/bookings/${sampleBooking._id}/calendar.ics`)
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('refuses .ics download with 404 for pending or cancelled bookings', async () => {
    Booking.findOne.mockReturnValue({
      populate: () => ({
        populate: () => ({
          lean: async () => ({
            ...sampleBooking,
            status: 'cancelled',
            learnerId: { _id: 'learner-user-id', name: 'Learner User' },
            mentorId: { _id: 'mentor-user-id', name: 'Mentor User' }
          })
        })
      })
    });

    const cookie = makeAuthCookie('learner-user-id', 'learner');
    const res = await request(app)
      .get(`/api/bookings/${sampleBooking._id}/calendar.ics`)
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CALENDAR_UNAVAILABLE');
  });

  it('filters GET /api/bookings with from and to query parameters', async () => {
    Booking.find.mockReturnValue({
      sort: () => ({
        populate: () => ({
          populate: () => ({
            lean: async () => [sampleBooking]
          })
        })
      })
    });

    const cookie = makeAuthCookie('learner-user-id', 'learner');
    const res = await request(app)
      .get('/api/bookings')
      .query({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.000Z'
      })
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(Booking.find).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-user-id',
        startTime: {
          $gte: new Date('2026-10-01T00:00:00.000Z'),
          $lte: new Date('2026-10-31T23:59:59.000Z')
        }
      })
    );
  });
});
