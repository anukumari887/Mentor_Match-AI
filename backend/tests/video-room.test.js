jest.mock('../src/config/env', () => ({ env: { CORS_ORIGIN: 'http://localhost:3000' } }));
jest.mock('../src/utils/token', () => ({ COOKIE_NAME: 'token', verifyToken: jest.fn() }));
jest.mock('../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../src/models/Booking', () => ({ findById: jest.fn() }));

const http = require('node:http');
const { io: createClient } = require('socket.io-client');
const { verifyToken } = require('../src/utils/token');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const { createVideoServer } = require('../src/socket/video');

const bookingId = '507f1f77bcf86cd799439011';
const learnerId = '507f1f77bcf86cd799439012';
const mentorId = '507f1f77bcf86cd799439013';
const strangerId = '507f1f77bcf86cd799439014';

describe('Authenticated video room signaling', () => {
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
      inactive: { _id: learnerId, isActive: false }
    };
    verifyToken.mockImplementation((token) => ({ id: token }));
    User.findById.mockImplementation(async (id) => users[id] || null);
    Booking.findById.mockImplementation(async () => booking);
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

  function join(socket) {
    return new Promise((resolve) => socket.emit('join-room', { bookingId }, resolve));
  }

  it('authenticates two participants, relays only within the room, and rejects a third connection', async () => {
    const learner = await connect('learner');
    const mentor = await connect('mentor');
    const peerJoined = new Promise((resolve) => learner.once('peer-joined', resolve));

    expect(await join(learner)).toMatchObject({ ok: true, bookingId });
    expect(await join(mentor)).toMatchObject({ ok: true, bookingId });
    expect(await peerJoined).toMatchObject({ userId: mentorId });

    const receivedSignal = new Promise((resolve) => mentor.once('signal', resolve));
    learner.emit('signal', { bookingId, type: 'offer', data: { sdp: 'offer-sdp' } });
    expect(await receivedSignal).toMatchObject({ type: 'offer', data: { sdp: 'offer-sdp' }, fromUserId: learnerId });

    const third = await connect('learner');
    expect(await join(third)).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
  });

  it('rejects anonymous handshakes and authorized users who are not participants', async () => {
    await expect(connect(null)).rejects.toThrow('UNAUTHORIZED');
    const stranger = await connect('stranger');
    expect(await join(stranger)).toMatchObject({ ok: false, error: { code: 'NOT_PARTICIPANT' } });
  });

  it('rejects rooms before their join window or when the booking is not confirmed', async () => {
    booking.startTime = new Date(Date.now() + 60 * 60 * 1000);
    booking.endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const learner = await connect('learner');
    expect(await join(learner)).toMatchObject({ ok: false, error: { code: 'ROOM_CLOSED' } });

    booking.startTime = new Date(Date.now() - 60 * 1000);
    booking.status = 'pending';
    expect(await join(learner)).toMatchObject({ ok: false, error: { code: 'BOOKING_NOT_CONFIRMED' } });
  });
});