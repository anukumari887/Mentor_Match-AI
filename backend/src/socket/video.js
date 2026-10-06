const { Server } = require('socket.io');
const cookie = require('cookie');
const { z } = require('zod');
const { env } = require('../config/env');
const { COOKIE_NAME, verifyToken } = require('../utils/token');
const User = require('../models/User');
const Booking = require('../models/Booking');

const bookingIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const joinSchema = z.object({ bookingId: bookingIdSchema }).strict();
const signalSchema = z.object({
  bookingId: bookingIdSchema,
  type: z.enum(['offer', 'answer', 'candidate']),
  data: z.unknown()
}).strict();

const JOIN_EARLY_MS = 10 * 60 * 1000;
const JOIN_LATE_MS = 15 * 60 * 1000;

function isWithinJoinWindow(booking, now = Date.now()) {
  const opensAt = new Date(booking.startTime).getTime() - JOIN_EARLY_MS;
  const closesAt = new Date(booking.endTime).getTime() + JOIN_LATE_MS;
  return now >= opensAt && now <= closesAt;
}

function withRoomLock(room, locks, operation) {
  const previous = locks.get(room) || Promise.resolve();
  let unlock;
  const gate = new Promise((resolve) => { unlock = resolve; });
  const queued = previous.then(() => gate);
  locks.set(room, queued);

  return previous.then(operation).finally(() => {
    unlock();
    if (locks.get(room) === queued) locks.delete(room);
  });
}

function createVideoServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true }
  });
  const roomLocks = new Map();

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id);
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const joinedRooms = new Set();
    const emitRoomError = (code, message, ack) => {
      const error = { code, message };
      socket.emit('room-error', error);
      if (typeof ack === 'function') ack({ ok: false, error });
    };

    socket.on('join-room', async (payload, ack) => {
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) return emitRoomError('INVALID_BOOKING', 'A valid booking id is required.', ack);
      const { bookingId } = parsed.data;

      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return emitRoomError('BOOKING_NOT_FOUND', 'This session could not be found.', ack);
        const userId = String(socket.data.user._id);
        if (![String(booking.learnerId), String(booking.mentorId)].includes(userId)) {
          return emitRoomError('NOT_PARTICIPANT', 'You are not part of this session.', ack);
        }
        if (booking.status !== 'confirmed') {
          return emitRoomError('BOOKING_NOT_CONFIRMED', 'Only confirmed sessions can be joined.', ack);
        }
        if (!isWithinJoinWindow(booking)) {
          return emitRoomError('ROOM_CLOSED', 'The session room is not open yet or has closed.', ack);
        }

        await withRoomLock(bookingId, roomLocks, async () => {
          const members = io.sockets.adapter.rooms.get(bookingId);
          if (members?.size >= 2) {
            emitRoomError('ROOM_FULL', 'This session already has two participants.', ack);
            return;
          }
          await socket.join(bookingId);
          joinedRooms.add(bookingId);
          socket.to(bookingId).emit('peer-joined', { userId });
          if (typeof ack === 'function') ack({ ok: true, bookingId });
        });
      } catch {
        emitRoomError('ROOM_ERROR', 'The session room could not be opened.', ack);
      }
    });

    socket.on('signal', (payload) => {
      const parsed = signalSchema.safeParse(payload);
      if (!parsed.success) return emitRoomError('INVALID_SIGNAL', 'The signaling message is invalid.');
      const { bookingId, type, data } = parsed.data;
      if (!joinedRooms.has(bookingId)) return emitRoomError('NOT_IN_ROOM', 'Join the session before sending signals.');
      socket.to(bookingId).emit('signal', { type, data, fromUserId: String(socket.data.user._id) });
    });

    socket.on('leave-room', async (payload) => {
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) return;
      const { bookingId } = parsed.data;
      if (!joinedRooms.delete(bookingId)) return;
      await socket.leave(bookingId);
      socket.to(bookingId).emit('peer-left', { userId: String(socket.data.user._id) });
    });

    socket.on('disconnecting', () => {
      for (const room of joinedRooms) {
        socket.to(room).emit('peer-left', { userId: String(socket.data.user._id) });
      }
    });
  });

  return io;
}

module.exports = { createVideoServer, isWithinJoinWindow, withRoomLock };