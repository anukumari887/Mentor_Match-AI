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
const mediaStateSchema = z.object({
  bookingId: bookingIdSchema,
  audio: z.boolean(),
  video: z.boolean()
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

let globalIo = null;

function getIo() {
  return globalIo;
}

function createVideoServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    maxHttpBufferSize: 1e5 // 100kb limit
  });
  globalIo = io;

  const roomLocks = new Map();
  // Map of bookingId -> Map<userId, socketId>
  const roomUsers = new Map();
  const socketRateLimits = new Map();

  function checkRateLimit(socket, limit = 150, windowMs = 60000) {
    const now = Date.now();
    let entry = socketRateLimits.get(socket.id);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      socketRateLimits.set(socket.id, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      socket.emit('room-error', { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' });
      return false;
    }
    return true;
  }

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id);
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
      const tokenVersion = payload.tv !== undefined ? payload.tv : 0;
      const currentVersion = user.tokenVersion || 0;
      if (tokenVersion !== currentVersion) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.data.user._id);
    const joinedRooms = new Set();
    socket.data.joinedRooms = joinedRooms;

    // Join private room for direct user events (Part 10: chat)
    socket.join(`user:${userId}`);

    const emitRoomError = (code, message, ack) => {
      const error = { code, message };
      socket.emit('room-error', error);
      if (typeof ack === 'function') ack({ ok: false, error });
    };

    socket.on('join-room', async (payload, ack) => {
      if (!checkRateLimit(socket)) return;
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) return emitRoomError('INVALID_BOOKING', 'A valid booking id is required.', ack);
      const { bookingId } = parsed.data;

      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return emitRoomError('BOOKING_NOT_FOUND', 'This session could not be found.', ack);
        if (![String(booking.learnerId), String(booking.mentorId)].includes(userId)) {
          return emitRoomError('NOT_PARTICIPANT', 'You are not part of this session.', ack);
        }
        if (!['confirmed', 'completed'].includes(booking.status)) {
          return emitRoomError('BOOKING_NOT_CONFIRMED', 'Only confirmed sessions can be joined.', ack);
        }
        if (!isWithinJoinWindow(booking)) {
          return emitRoomError('ROOM_CLOSED', 'The session room is not open yet or has closed.', ack);
        }

        await withRoomLock(bookingId, roomLocks, async () => {
          let userMap = roomUsers.get(bookingId);
          if (!userMap) {
            userMap = new Map();
            roomUsers.set(bookingId, userMap);
          }

          // If the same user connects again (second tab or refresh), replace the old connection
          const existingSocketId = userMap.get(userId);
          if (existingSocketId && existingSocketId !== socket.id) {
            const existingSocket = io.sockets.sockets.get(existingSocketId);
            if (existingSocket) {
              existingSocket.emit('room-error', {
                code: 'SESSION_REPLACED',
                message: 'Session opened in another window or tab.'
              });
              await existingSocket.leave(bookingId);
              if (existingSocket.data?.joinedRooms) {
                existingSocket.data.joinedRooms.delete(bookingId);
              }
            }
            userMap.delete(userId);
          }

          // Count distinct people in room
          if (userMap.size >= 2) {
            emitRoomError('ROOM_FULL', 'This session already has two participants.', ack);
            return;
          }

          userMap.set(userId, socket.id);
          await socket.join(bookingId);
          joinedRooms.add(bookingId);

          // peer-joined is sent ONLY to the person already in the room
          socket.to(bookingId).emit('peer-joined', { userId });
          if (typeof ack === 'function') ack({ ok: true, bookingId });
        });
      } catch {
        emitRoomError('ROOM_ERROR', 'The session room could not be opened.', ack);
      }
    });

    socket.on('signal', (payload) => {
      if (!checkRateLimit(socket)) return;
      const parsed = signalSchema.safeParse(payload);
      if (!parsed.success) return emitRoomError('INVALID_SIGNAL', 'The signaling message is invalid.');
      const { bookingId, type, data } = parsed.data;
      if (!joinedRooms.has(bookingId)) return emitRoomError('NOT_IN_ROOM', 'Join the session before sending signals.');
      socket.to(bookingId).emit('signal', { type, data, fromUserId: userId });
    });

    socket.on('media-state', (payload) => {
      if (!checkRateLimit(socket)) return;
      const parsed = mediaStateSchema.safeParse(payload);
      if (!parsed.success) return emitRoomError('INVALID_MEDIA_STATE', 'The media state is invalid.');
      const { bookingId, audio, video } = parsed.data;
      if (!joinedRooms.has(bookingId)) return emitRoomError('NOT_IN_ROOM', 'Join the session before sending media state.');
      socket.to(bookingId).emit('media-state', { audio, video, fromUserId: userId });
    });

    const leaveBooking = async (bookingId) => {
      if (!joinedRooms.delete(bookingId)) return;
      await socket.leave(bookingId);
      const userMap = roomUsers.get(bookingId);
      if (userMap && userMap.get(userId) === socket.id) {
        userMap.delete(userId);
        if (userMap.size === 0) roomUsers.delete(bookingId);
      }
      socket.to(bookingId).emit('peer-left', { userId });
    };

    socket.on('leave-room', async (payload) => {
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) return;
      await leaveBooking(parsed.data.bookingId);
    });

    socket.on('disconnecting', () => {
      for (const room of Array.from(joinedRooms)) {
        leaveBooking(room);
      }
    });

    socket.on('disconnect', () => {
      socketRateLimits.delete(socket.id);
    });
  });

  return io;
}

module.exports = {
  createVideoServer,
  isWithinJoinWindow,
  withRoomLock,
  getIo
};