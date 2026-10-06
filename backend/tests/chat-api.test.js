const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/models/User');
jest.mock('../src/models/Booking');
jest.mock('../src/models/Conversation');
jest.mock('../src/models/Message');
jest.mock('../src/services/email', () => ({
  sendChatMessageEmail: jest.fn().mockResolvedValue(true)
}));
jest.mock('../src/utils/token', () => ({
  COOKIE_NAME: 'token',
  verifyToken: jest.fn()
}));
jest.mock('../src/socket/video', () => {
  const emitMock = jest.fn();
  const toMock = jest.fn(() => ({ emit: emitMock }));
  const inMock = jest.fn(() => ({ allSockets: jest.fn().mockResolvedValue(new Set()) }));
  return {
    getIo: jest.fn(() => ({
      to: toMock,
      in: inMock
    })),
    createVideoServer: jest.fn(),
    isWithinJoinWindow: jest.fn(),
    withRoomLock: jest.fn()
  };
});

const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const { verifyToken } = require('../src/utils/token');
const { sendChatMessageEmail } = require('../src/services/email');
const { getIo } = require('../src/socket/video');

describe('Learner-Mentor Chat API', () => {
  const learnerId = '507f1f77bcf86cd799439011';
  const mentorId = '507f1f77bcf86cd799439012';
  const strangerId = '507f1f77bcf86cd799439013';
  const convId = '507f1f77bcf86cd799439099';

  const learnerUser = { _id: learnerId, name: 'Alice Learner', email: 'learner01@mentormatch.local', role: 'learner', isActive: true, tokenVersion: 0 };
  const mentorUser = { _id: mentorId, name: 'Bob Mentor', email: 'mentor01@mentormatch.local', role: 'mentor', isActive: true, tokenVersion: 0 };
  const strangerUser = { _id: strangerId, name: 'Eve Stranger', email: 'stranger@mentormatch.local', role: 'learner', isActive: true, tokenVersion: 0 };

  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockImplementation((id) => {
      const idStr = String(id?._id || id);
      const user = idStr === learnerId ? learnerUser : idStr === mentorId ? mentorUser : idStr === strangerId ? strangerUser : null;
      return {
        select: () => ({
          lean: () => Promise.resolve(user)
        }),
        lean: () => Promise.resolve(user),
        ...user
      };
    });

    verifyToken.mockImplementation((token) => {
      if (token === 'learner-token') return { id: learnerId, tv: 0 };
      if (token === 'mentor-token') return { id: mentorId, tv: 0 };
      if (token === 'stranger-token') return { id: strangerId, tv: 0 };
      throw new Error('Invalid token');
    });

    // Default valid booking
    const validBooking = {
      _id: 'b1',
      learnerId,
      mentorId,
      status: 'confirmed',
      endTime: new Date(Date.now() + 60 * 60 * 1000)
    };
    Booking.find.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve([validBooking])
        })
      })
    });
  });

  describe('GET /api/chats/access', () => {
    it('returns access true when learner has a confirmed booking', async () => {
      Conversation.findOne.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve({ _id: convId })
        })
      });

      const res = await request(app)
        .get(`/api/chats/access?mentorId=${mentorId}`)
        .set('Cookie', 'token=learner-token');

      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
      expect(res.body.validUntil).toBeDefined();
      expect(res.body.conversationId).toBe(convId);
    });

    it('denies mentor role from checking learner access endpoint', async () => {
      const res = await request(app)
        .get(`/api/chats/access?mentorId=${mentorId}`)
        .set('Cookie', 'token=mentor-token');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/chats', () => {
    it('creates or returns existing conversation for learner with access', async () => {
      Conversation.findOneAndUpdate.mockResolvedValue({
        _id: convId,
        learnerId,
        mentorId,
        lastMessageAt: null,
        lastMessagePreview: ''
      });

      const res = await request(app)
        .post('/api/chats')
        .set('Cookie', 'token=learner-token')
        .send({ mentorId });

      expect(res.status).toBe(200);
      expect(res.body.conversation._id).toBe(convId);
    });

    it('returns 403 CHAT_NOT_AVAILABLE if learner has no paid booking', async () => {
      Booking.find.mockReturnValue({
        sort: () => ({
          select: () => ({
            lean: () => Promise.resolve([])
          })
        })
      });

      const res = await request(app)
        .post('/api/chats')
        .set('Cookie', 'token=learner-token')
        .send({ mentorId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CHAT_NOT_AVAILABLE');
    });

    it('returns 403 when mentor attempts to initiate conversation', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Cookie', 'token=mentor-token')
        .send({ mentorId });

      expect(res.status).toBe(403);
    });
  });

  describe('IDOR & Security Protection', () => {
    it('returns 404 (never 403) when stranger tries to access someone else conversation', async () => {
      Conversation.findOne.mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(null)
          })
        }),
        _id: null
      });

      const res = await request(app)
        .get(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=stranger-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when stranger attempts to send message to someone else conversation', async () => {
      Conversation.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=stranger-token')
        .send({ body: 'Hello', clientMessageId: 'msg-1' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/chats/:id/messages (Sending)', () => {
    const existingConv = {
      _id: convId,
      learnerId,
      mentorId
    };

    beforeEach(() => {
      Conversation.findOne.mockResolvedValue(existingConv);
      Conversation.updateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    it('trims body, strips control characters, stores HTML as plain text and emits real-time event', async () => {
      const createdAt = new Date();
      Message.findOne.mockResolvedValue(null);
      Message.create.mockResolvedValue({
        _id: 'm1',
        conversationId: convId,
        senderId: learnerId,
        body: '<script>alert(1)</script> Hello!',
        clientMessageId: 'client-123',
        createdAt
      });

      const res = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({
          body: '  \x00<script>alert(1)</script> Hello!  \x07',
          clientMessageId: 'client-123'
        });

      expect(res.status).toBe(201);
      expect(res.body.message.body).toBe('<script>alert(1)</script> Hello!');
      expect(res.body.message.senderName).toBe('Alice Learner');

      const io = getIo();
      expect(io.to).toHaveBeenCalledWith(`user:${learnerId}`);
      expect(io.to).toHaveBeenCalledWith(`user:${mentorId}`);
    });

    it('rejects empty body, body exceeding 2000 chars, and unknown properties', async () => {
      const resEmpty = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: '   ', clientMessageId: 'c1' });
      expect(resEmpty.status).toBe(400);

      const resLong = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'a'.repeat(2001), clientMessageId: 'c1' });
      expect(resLong.status).toBe(400);

      const resExtra = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'hello', clientMessageId: 'c1', extraParam: true });
      expect(resExtra.status).toBe(400);
    });

    it('handles idempotent retries: same clientMessageId returns existing message', async () => {
      const existingMessage = {
        _id: 'm1',
        conversationId: convId,
        senderId: learnerId,
        body: 'Already sent',
        clientMessageId: 'client-dup',
        createdAt: new Date()
      };
      Message.findOne.mockResolvedValue(existingMessage);

      const res = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'Already sent', clientMessageId: 'client-dup' });

      expect(res.status).toBe(200);
      expect(res.body.message.clientMessageId).toBe('client-dup');
      expect(Message.create).not.toHaveBeenCalled();
    });

    it('returns 403 CHAT_EXPIRED when chat has expired while reading history still succeeds', async () => {
      // Mock booking ended 10 days ago (expired with 7-day validity)
      const expiredBooking = {
        _id: 'b1',
        learnerId,
        mentorId,
        status: 'completed',
        endTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      };
      Booking.find.mockReturnValue({
        sort: () => ({
          select: () => ({
            lean: () => Promise.resolve([expiredBooking])
          })
        })
      });

      const resSend = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'Try sending after expired', clientMessageId: 'msg-exp' });

      expect(resSend.status).toBe(403);
      expect(resSend.body.error.code).toBe('CHAT_EXPIRED');

      // History read still works
      Conversation.findOne.mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve({
              _id: convId,
              learnerId,
              mentorId
            })
          })
        })
      });
      Message.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            populate: () => ({
              lean: () => Promise.resolve([])
            })
          })
        })
      });

      const resRead = await request(app)
        .get(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token');

      expect(resRead.status).toBe(200);
      expect(resRead.body.canSend).toBe(false);
    });

    it('sends email when recipient has no active socket and throttles to once per 30 minutes', async () => {
      Message.findOne.mockResolvedValue(null);
      Message.create.mockResolvedValue({
        _id: 'm1',
        conversationId: convId,
        senderId: learnerId,
        body: 'Hello mentor',
        clientMessageId: 'client-email',
        createdAt: new Date()
      });

      // Atomic findOneAndUpdate returns updated doc (not throttled)
      Conversation.findOneAndUpdate.mockResolvedValue({
        _id: convId,
        mentorEmailNotifiedAt: new Date()
      });

      await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'Hello mentor', clientMessageId: 'client-email' });

      expect(sendChatMessageEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: expect.objectContaining({ email: 'mentor01@mentormatch.local' }),
          senderName: 'Alice Learner',
          conversationId: convId
        })
      );
    });

    it('does not send email if recipient is connected or already notified within 30 minutes', async () => {
      Message.findOne.mockResolvedValue(null);
      Message.create.mockResolvedValue({
        _id: 'm1',
        conversationId: convId,
        senderId: learnerId,
        body: 'Hello again',
        clientMessageId: 'client-throttled',
        createdAt: new Date()
      });

      // Throttled: findOneAndUpdate returns null
      Conversation.findOneAndUpdate.mockResolvedValue(null);

      await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'Hello again', clientMessageId: 'client-throttled' });

      expect(sendChatMessageEmail).not.toHaveBeenCalled();
    });

    it('sending succeeds even if email service throws', async () => {
      sendChatMessageEmail.mockRejectedValueOnce(new Error('SMTP down'));
      Message.findOne.mockResolvedValue(null);
      Message.create.mockResolvedValue({
        _id: 'm1',
        conversationId: convId,
        senderId: learnerId,
        body: 'Resilient send',
        clientMessageId: 'client-resilient',
        createdAt: new Date()
      });
      Conversation.findOneAndUpdate.mockResolvedValue({ _id: convId });

      const res = await request(app)
        .post(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token')
        .send({ body: 'Resilient send', clientMessageId: 'client-resilient' });

      expect(res.status).toBe(201);
    });
  });

  describe('Privacy & Responses', () => {
    it('never leaks email addresses, password hashes or internal fields', async () => {
      Conversation.findOne.mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve({
              _id: convId,
              learnerId,
              mentorId
            })
          })
        })
      });
      Message.find.mockReturnValue({
        sort: () => ({
          limit: () => ({
            populate: () => ({
              lean: () => Promise.resolve([
                {
                  _id: 'm1',
                  conversationId: convId,
                  senderId: { _id: learnerId, name: 'Alice', passwordHash: 'secret_hash', email: 'alice@test.com' },
                  body: 'Hey',
                  clientMessageId: 'c1',
                  createdAt: new Date()
                }
              ])
            })
          })
        })
      });

      const res = await request(app)
        .get(`/api/chats/${convId}/messages`)
        .set('Cookie', 'token=learner-token');

      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('passwordHash');
      expect(text).not.toContain('alice@test.com');
    });
  });

  describe('Unread count & POST /api/chats/:id/read', () => {
    it('marks conversation as read and emits chat:read event', async () => {
      Conversation.findOne.mockResolvedValue({
        _id: convId,
        learnerId,
        mentorId
      });
      Conversation.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const res = await request(app)
        .post(`/api/chats/${convId}/read`)
        .set('Cookie', 'token=learner-token');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const io = getIo();
      expect(io.to).toHaveBeenCalledWith(`user:${mentorId}`);
    });

    it('returns total unread count from /unread-count', async () => {
      Conversation.find.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([
            { _id: convId, learnerId, mentorId, learnerLastReadAt: new Date(0) }
          ])
        })
      });
      Message.countDocuments.mockResolvedValue(3);

      const res = await request(app)
        .get('/api/chats/unread-count')
        .set('Cookie', 'token=learner-token');

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(3);
    });
  });
});
