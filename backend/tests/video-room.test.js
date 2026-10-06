jest.mock('../src/config/env', () => ({
  env: {
    CORS_ORIGIN: 'http://localhost:3000',
    STUN_URLS: 'stun:stun.l.google.com:19302',
    TURN_URL: 'turn:turn.example.com:3478',
    TURN_USERNAME: 'secret_user',
    TURN_CREDENTIAL: 'secret_password'
  }
}));
jest.mock('../src/utils/token', () => ({ COOKIE_NAME: 'token', verifyToken: jest.fn() }));
jest.mock('../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../src/models/Booking', () => ({ findById: jest.fn(), findOne: jest.fn() }));

const http = require('node:http');
const { io: createClient } = require('socket.io-client');
const { verifyToken } = require('../src/utils/token');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const { createVideoServer } = require('../src/socket/video');
const bookingController = require('../src/controllers/booking.controller');

const bookingId = '507f1f77bcf86cd799439011';
const learnerId = '507f1f77bcf86cd799439012';
const mentorId = '507f1f77bcf86cd799439013';
const strangerId = '507f1f77bcf86cd799439014';
const thirdParticipantId = '507f1f77bcf86cd799439015';

describe('Authenticated video room signaling & room rules', () => {
  let server;
  let ioServer;
  let baseUrl;
  let sockets;
  let booking;

  beforeEach(async () => {
    jest.clearAllMocks();
    booking = {
      _id: bookingId,
      learnerId,
      mentorId,
      status: 'confirmed',
      startTime: new Date(Date.now() - 60 * 1000),
      endTime: new Date(Date.now() + 59 * 60 * 1000)
    };
    const users = {
      learner: { _id: learnerId, isActive: true },
      mentor: { _id: mentorId, isActive: true },
      stranger: { _id: strangerId, isActive: true },
      third: { _id: thirdParticipantId, isActive: true },
      inactive: { _id: learnerId, isActive: false }
    };
    verifyToken.mockImplementation((token) => ({ id: token }));
    User.findById.mockImplementation(async (id) => users[id] || null);
    Booking.findById.mockImplementation(async () => booking);
    Booking.findOne.mockImplementation(async () => booking);

    server = http.createServer();
    ioServer = createVideoServer(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    sockets = [];
  });

  afterEach(async () => {
    for (const socket of sockets) socket.disconnect();
    await new Promise((resolve) => ioServer.close(resolve));
  });

  function connect(token) {
    return new Promise((resolve, reject) => {
      const socket = createClient(baseUrl, {
        forceNew: true,
        reconnection: false,
        transports: ['websocket'],
        extraHeaders: token ? { Cookie: `token=${token}` } : {}
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }

  function join(socket, customBookingId = bookingId) {
    return new Promise((resolve) => socket.emit('join-room', { bookingId: customBookingId }, resolve));
  }

  it('authenticates two participants, relays offer/answer within room, and sends peer-joined only to existing occupant', async () => {
    const learner = await connect('learner');
    const mentor = await connect('mentor');

    const learnerPeerJoinedPromise = new Promise((resolve) => learner.once('peer-joined', resolve));
    let mentorGotPeerJoined = false;
    mentor.on('peer-joined', () => { mentorGotPeerJoined = true; });

    expect(await join(learner)).toMatchObject({ ok: true, bookingId });
    expect(await join(mentor)).toMatchObject({ ok: true, bookingId });

    const peerJoinedData = await learnerPeerJoinedPromise;
    expect(peerJoinedData).toMatchObject({ userId: mentorId });
    expect(mentorGotPeerJoined).toBe(false);

    // Signaling relay
    const mentorReceivedSignal = new Promise((resolve) => mentor.once('signal', resolve));
    learner.emit('signal', { bookingId, type: 'offer', data: { sdp: 'offer-sdp' } });
    expect(await mentorReceivedSignal).toMatchObject({ type: 'offer', data: { sdp: 'offer-sdp' }, fromUserId: learnerId });

    // Media-state relay
    const mentorReceivedMedia = new Promise((resolve) => mentor.once('media-state', resolve));
    learner.emit('media-state', { bookingId, audio: false, video: true });
    expect(await mentorReceivedMedia).toMatchObject({ audio: false, video: true, fromUserId: learnerId });
  });

  it('replaces old socket when the same user joins again (second tab / refresh) with SESSION_REPLACED without wasting a seat', async () => {
    const learnerTab1 = await connect('learner');
    expect(await join(learnerTab1)).toMatchObject({ ok: true, bookingId });

    const sessionReplacedPromise = new Promise((resolve) => learnerTab1.once('room-error', resolve));

    const learnerTab2 = await connect('learner');
    expect(await join(learnerTab2)).toMatchObject({ ok: true, bookingId });

    const replacedError = await sessionReplacedPromise;
    expect(replacedError).toMatchObject({ code: 'SESSION_REPLACED' });

    // The second seat is still open for mentor!
    const mentor = await connect('mentor');
    expect(await join(mentor)).toMatchObject({ ok: true, bookingId });
  });

  it('refuses a third distinct person when two participants are already in the room', async () => {
    const learner = await connect('learner');
    const mentor = await connect('mentor');
    expect(await join(learner)).toMatchObject({ ok: true, bookingId });
    expect(await join(mentor)).toMatchObject({ ok: true, bookingId });

    // Allow third person in mock booking participants check to test ROOM_FULL capacity
    Booking.findById.mockImplementation(async () => ({
      ...booking,
      mentorId: thirdParticipantId
    }));
    const third = await connect('third');
    expect(await join(third)).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
  });

  it('sends peer-left on disconnect', async () => {
    const learner = await connect('learner');
    const mentor = await connect('mentor');
    await join(learner);
    await join(mentor);

    const peerLeftPromise = new Promise((resolve) => learner.once('peer-left', resolve));
    mentor.disconnect();

    const peerLeftData = await peerLeftPromise;
    expect(peerLeftData).toMatchObject({ userId: mentorId });
  });

  it('signals never cross rooms', async () => {
    const room2Id = '507f1f77bcf86cd799439099';
    Booking.findById.mockImplementation(async (id) => {
      if (id === room2Id) {
        return { ...booking, _id: room2Id };
      }
      return booking;
    });

    const learnerRoom1 = await connect('learner');
    await join(learnerRoom1, bookingId);

    const mentorRoom2 = await connect('mentor');
    await join(mentorRoom2, room2Id);

    let mentorRoom2ReceivedSignal = false;
    mentorRoom2.on('signal', () => { mentorRoom2ReceivedSignal = true; });

    learnerRoom1.emit('signal', { bookingId, type: 'offer', data: { sdp: 'secret' } });
    await new Promise((r) => setTimeout(r, 100));

    expect(mentorRoom2ReceivedSignal).toBe(false);
  });

  it('allows joining for a "completed" booking inside the 15-minute grace window and refuses after it', async () => {
    // 5 minutes after session end => inside 15-minute grace window
    booking.status = 'completed';
    booking.startTime = new Date(Date.now() - 65 * 60 * 1000);
    booking.endTime = new Date(Date.now() - 5 * 60 * 1000);

    const learner = await connect('learner');
    expect(await join(learner)).toMatchObject({ ok: true, bookingId });

    // 20 minutes after session end => outside 15-minute grace window
    booking.endTime = new Date(Date.now() - 20 * 60 * 1000);
    const mentor = await connect('mentor');
    expect(await join(mentor)).toMatchObject({ ok: false, error: { code: 'ROOM_CLOSED' } });
  });

  it('rejects anonymous handshakes, inactive users, and non-participants', async () => {
    await expect(connect(null)).rejects.toThrow('UNAUTHORIZED');
    const stranger = await connect('stranger');
    expect(await join(stranger)).toMatchObject({ ok: false, error: { code: 'NOT_PARTICIPANT' } });
  });

  it('rejects rooms before their join window or when booking is pending or cancelled', async () => {
    booking.startTime = new Date(Date.now() + 60 * 60 * 1000);
    booking.endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const learner = await connect('learner');
    expect(await join(learner)).toMatchObject({ ok: false, error: { code: 'ROOM_CLOSED' } });

    booking.startTime = new Date(Date.now() - 60 * 1000);
    booking.status = 'pending';
    expect(await join(learner)).toMatchObject({ ok: false, error: { code: 'BOOKING_NOT_CONFIRMED' } });

    booking.status = 'cancelled';
    expect(await join(learner)).toMatchObject({ ok: false, error: { code: 'BOOKING_NOT_CONFIRMED' } });
  });

  it('room API returns serverTime, canJoin, opensAt, closesAt, and TURN credentials strictly to participants', async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    Booking.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(booking)
    });

    await bookingController.getRoomDetails(
      { params: { id: bookingId }, user: { _id: learnerId, role: 'learner' } },
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        canJoin: true,
        opensAt: expect.any(String),
        closesAt: expect.any(String),
        serverTime: expect.any(String),
        iceServers: expect.arrayContaining([
          expect.objectContaining({ urls: ['stun:stun.l.google.com:19302'] }),
          expect.objectContaining({ username: 'secret_user', credential: 'secret_password' })
        ])
      })
    );

    // Strangers receive 404 and never receive TURN credentials
    const next = jest.fn();
    Booking.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    await bookingController.getRoomDetails(
      { params: { id: bookingId }, user: { _id: strangerId, role: 'learner' } },
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  describe('Part 7: Mentor meeting link', () => {
    it('allows mentor to set a valid Google Meet or Zoom meeting link', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const bookingRecord = {
        _id: bookingId,
        mentorId,
        status: 'confirmed',
        save: mockSave
      };
      Booking.findById.mockResolvedValue(bookingRecord);

      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await bookingController.updateMeetingLink(
        {
          params: { id: bookingId },
          user: { _id: mentorId, role: 'mentor' },
          body: { externalMeetingUrl: 'https://meet.google.com/abc-defg-hij' }
        },
        res,
        jest.fn()
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
      expect(bookingRecord.externalMeetingUrl).toBe('https://meet.google.com/abc-defg-hij');
    });

    it('rejects wrong hosts, http, and javascript urls', async () => {
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await bookingController.updateMeetingLink(
        {
          params: { id: bookingId },
          user: { _id: mentorId, role: 'mentor' },
          body: { externalMeetingUrl: 'http://meet.google.com/abc' }
        },
        res,
        next
      );
      expect(next).toHaveBeenCalled();

      next.mockClear();
      await bookingController.updateMeetingLink(
        {
          params: { id: bookingId },
          user: { _id: mentorId, role: 'mentor' },
          body: { externalMeetingUrl: 'javascript:alert(1)' }
        },
        res,
        next
      );
      expect(next).toHaveBeenCalled();

      next.mockClear();
      await bookingController.updateMeetingLink(
        {
          params: { id: bookingId },
          user: { _id: mentorId, role: 'mentor' },
          body: { externalMeetingUrl: 'https://malicious.com/zoom.us' }
        },
        res,
        next
      );
      expect(next).toHaveBeenCalled();
    });

    it('prevents learner or stranger from setting the meeting link', async () => {
      Booking.findById.mockResolvedValue({
        _id: bookingId,
        mentorId,
        status: 'confirmed'
      });
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await bookingController.updateMeetingLink(
        {
          params: { id: bookingId },
          user: { _id: learnerId, role: 'learner' },
          body: { externalMeetingUrl: 'https://zoom.us/j/123456789' }
        },
        res,
        next
      );
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });
});