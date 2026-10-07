const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { getChatAccess } = require('../services/chatAccess');
const { sendChatMessageEmail } = require('../services/email');
const { chatMessagesTotal } = require('../utils/metrics');
const { AppError } = require('../utils/errors');
const { env } = require('../config/env');
const logger = require('../config/logger');
const { getIo } = require('../socket/video');
const {
  chatIdParamSchema,
  chatAccessQuerySchema,
  createChatSchema,
  sendMessageSchema,
  messagesQuerySchema
} = require('../validations/chat.validation');

async function getChatAccessEndpoint(req, res, next) {
  try {
    const { mentorId } = chatAccessQuerySchema.parse(req.query);
    const access = await getChatAccess(req.user._id, mentorId);

    const existing = await Conversation.findOne({
      learnerId: req.user._id,
      mentorId
    }).select('_id').lean();

    return res.status(200).json({
      allowed: access.allowed,
      validUntil: access.validUntil ? access.validUntil.toISOString() : null,
      reason: access.reason,
      conversationId: existing ? String(existing._id) : null
    });
  } catch (error) {
    return next(error);
  }
}

async function createChat(req, res, next) {
  try {
    const { mentorId } = createChatSchema.parse(req.body);
    const access = await getChatAccess(req.user._id, mentorId);

    if (!access.allowed) {
      return next(new AppError('You need a confirmed or completed session with this mentor to start a chat.', 403, 'CHAT_NOT_AVAILABLE'));
    }

    const conversation = await Conversation.findOneAndUpdate(
      { learnerId: req.user._id, mentorId },
      { $setOnInsert: { learnerId: req.user._id, mentorId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      conversation: {
        _id: String(conversation._id),
        learnerId: String(conversation.learnerId),
        mentorId: String(conversation.mentorId),
        lastMessageAt: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
        lastMessagePreview: conversation.lastMessagePreview || ''
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listChats(req, res, next) {
  try {
    const isLearner = req.user.role === 'learner';
    const filter = isLearner
      ? { learnerId: req.user._id }
      : { mentorId: req.user._id, lastMessageAt: { $ne: null } };

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate('learnerId', 'name')
      .populate('mentorId', 'name')
      .lean();

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserObj = isLearner ? conv.mentorId : conv.learnerId;
        const otherUser = {
          _id: otherUserObj?._id ? String(otherUserObj._id) : String(isLearner ? conv.mentorId : conv.learnerId),
          name: otherUserObj?.name || 'User'
        };

        const myLastRead = isLearner ? (conv.learnerLastReadAt || new Date(0)) : (conv.mentorLastReadAt || new Date(0));
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: req.user._id },
          createdAt: { $gt: myLastRead }
        });

        const access = await getChatAccess(conv.learnerId, conv.mentorId);

        return {
          _id: String(conv._id),
          otherUser,
          lastMessagePreview: conv.lastMessagePreview || '',
          lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
          unreadCount,
          canSend: access.allowed,
          validUntil: access.validUntil ? access.validUntil.toISOString() : null
        };
      })
    );

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const isLearner = req.user.role === 'learner';
    const filter = isLearner
      ? { learnerId: req.user._id }
      : { mentorId: req.user._id };

    const conversations = await Conversation.find(filter)
      .select('_id learnerId mentorId learnerLastReadAt mentorLastReadAt')
      .lean();

    const unreadCounts = await Promise.all(
      conversations.map((conv) => {
        const myLastRead = isLearner ? (conv.learnerLastReadAt || new Date(0)) : (conv.mentorLastReadAt || new Date(0));
        return Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: req.user._id },
          createdAt: { $gt: myLastRead }
        });
      })
    );

    const totalUnread = unreadCounts.reduce((acc, count) => acc + count, 0);
    return res.status(200).json({ unreadCount: Math.max(0, totalUnread) });
  } catch (error) {
    return next(error);
  }
}

async function getChatMessages(req, res, next) {
  try {
    const { id } = chatIdParamSchema.parse(req.params);
    const { before, limit } = messagesQuerySchema.parse(req.query);

    const conversation = await Conversation.findOne({
      _id: id,
      $or: [{ learnerId: req.user._id }, { mentorId: req.user._id }]
    })
      .populate('learnerId', 'name')
      .populate('mentorId', 'name')
      .lean();

    // 404 for non-participants to prevent IDOR enumeration
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404, 'NOT_FOUND'));
    }

    const messageFilter = { conversationId: id };
    if (before) {
      messageFilter.createdAt = { $lt: new Date(before) };
    }

    const rawMessages = await Message.find(messageFilter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('senderId', 'name')
      .lean();

    const hasMore = rawMessages.length > limit;
    const paginated = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Return chronological order
    const sorted = paginated.reverse().map((msg) => ({
      _id: String(msg._id),
      conversationId: String(msg.conversationId),
      senderId: String(msg.senderId?._id || msg.senderId),
      senderName: msg.senderId?.name || 'User',
      body: msg.body,
      clientMessageId: msg.clientMessageId,
      createdAt: msg.createdAt.toISOString()
    }));

    const access = await getChatAccess(conversation.learnerId, conversation.mentorId);
    const isLearner = String(req.user._id) === String(conversation.learnerId._id || conversation.learnerId);
    const otherUserObj = isLearner ? conversation.mentorId : conversation.learnerId;

    return res.status(200).json({
      messages: sorted,
      hasMore,
      canSend: access.allowed,
      validUntil: access.validUntil ? access.validUntil.toISOString() : null,
      otherUser: {
        _id: String(otherUserObj._id || otherUserObj),
        name: otherUserObj.name || 'User'
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { id } = chatIdParamSchema.parse(req.params);
    const { body, clientMessageId } = sendMessageSchema.parse(req.body);

    const conversation = await Conversation.findOne({
      _id: id,
      $or: [{ learnerId: req.user._id }, { mentorId: req.user._id }]
    });

    if (!conversation) {
      return next(new AppError('Conversation not found.', 404, 'NOT_FOUND'));
    }

    // Access check: must be active participants with valid window
    const access = await getChatAccess(conversation.learnerId, conversation.mentorId);
    if (!access.allowed) {
      if (access.reason === 'CHAT_EXPIRED') {
        return next(new AppError('This chat has ended. You can still view message history.', 403, 'CHAT_EXPIRED'));
      }
      return next(new AppError('Chat access is not available.', 403, 'CHAT_NOT_AVAILABLE'));
    }

    // Sanitize body: remove control characters except \r and \n, trim
    const sanitizedBody = body.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    if (!sanitizedBody) {
      return next(new AppError('Message body cannot be empty.', 400, 'VALIDATION_ERROR'));
    }

    // Check duplicate clientMessageId idempotency
    const existingMessage = await Message.findOne({
      conversationId: id,
      senderId: req.user._id,
      clientMessageId
    });

    if (existingMessage) {
      return res.status(200).json({
        message: {
          _id: String(existingMessage._id),
          conversationId: String(id),
          senderId: String(req.user._id),
          senderName: req.user.name,
          body: existingMessage.body,
          clientMessageId: existingMessage.clientMessageId,
          createdAt: existingMessage.createdAt.toISOString()
        }
      });
    }

    let message;
    try {
      message = await Message.create({
        conversationId: id,
        senderId: req.user._id,
        body: sanitizedBody,
        clientMessageId
      });
    } catch (err) {
      if (err.code === 11000) {
        const dupMessage = await Message.findOne({
          conversationId: id,
          senderId: req.user._id,
          clientMessageId
        });
        return res.status(200).json({
          message: {
            _id: String(dupMessage._id),
            conversationId: String(id),
            senderId: String(req.user._id),
            senderName: req.user.name,
            body: dupMessage.body,
            clientMessageId: dupMessage.clientMessageId,
            createdAt: dupMessage.createdAt.toISOString()
          }
        });
      }
      throw err;
    }

    // Update conversation metadata & lastReadAt
    const isLearner = String(req.user._id) === String(conversation.learnerId);
    const updateFields = {
      lastMessageAt: message.createdAt,
      lastMessagePreview: sanitizedBody.slice(0, 80),
      [isLearner ? 'learnerLastReadAt' : 'mentorLastReadAt']: message.createdAt
    };

    await Conversation.updateOne({ _id: id }, { $set: updateFields });

    const messagePayload = {
      _id: String(message._id),
      conversationId: String(id),
      senderId: String(req.user._id),
      senderName: req.user.name,
      body: message.body,
      clientMessageId: message.clientMessageId,
      createdAt: message.createdAt.toISOString()
    };

    // Emit real-time Socket.IO chat event to both user rooms
    const io = getIo();
    if (io) {
      io.to(`user:${conversation.learnerId}`).emit('chat:message', {
        conversationId: String(id),
        message: messagePayload
      });
      io.to(`user:${conversation.mentorId}`).emit('chat:message', {
        conversationId: String(id),
        message: messagePayload
      });
    }

    // Check if recipient is offline (no socket in user room) to send email
    const recipientId = isLearner ? conversation.mentorId : conversation.learnerId;
    let recipientHasSockets = false;
    if (io) {
      try {
        const socketsInRoom = await io.in(`user:${recipientId}`).allSockets();
        if (socketsInRoom && socketsInRoom.size > 0) {
          recipientHasSockets = true;
        }
      } catch (e) {
        logger.warn({ message: e.message }, 'Could not inspect recipient sockets');
      }
    }

    if (!recipientHasSockets) {
      const emailField = isLearner ? 'mentorEmailNotifiedAt' : 'learnerEmailNotifiedAt';
      const throttleMinutes = env.CHAT_EMAIL_THROTTLE_MINUTES || 10;
      const throttleThreshold = new Date(Date.now() - throttleMinutes * 60 * 1000);

      // Atomic rate limit: at most one email per conversation per recipient every CHAT_EMAIL_THROTTLE_MINUTES
      const updatedConv = await Conversation.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { [emailField]: null },
            { [emailField]: { $lt: throttleThreshold } }
          ]
        },
        { $set: { [emailField]: new Date() } },
        { new: true }
      );

      if (updatedConv) {
        User.findById(recipientId)
          .select('name email')
          .lean()
          .then((recipient) => {
            if (recipient) {
              sendChatMessageEmail({
                recipient,
                senderName: req.user.name,
                conversationId: id,
                messageText: sanitizedBody
              }).catch((err) => {
                logger.warn({ message: err.message }, 'Failed to send chat message email');
              });
            }
          })
          .catch((err) => {
            logger.warn({ message: err.message }, 'Failed to look up recipient for chat email');
          });
      }
    }

    chatMessagesTotal.inc();
    return res.status(201).json({ message: messagePayload });
  } catch (error) {
    return next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = chatIdParamSchema.parse(req.params);

    const conversation = await Conversation.findOne({
      _id: id,
      $or: [{ learnerId: req.user._id }, { mentorId: req.user._id }]
    });

    if (!conversation) {
      return next(new AppError('Conversation not found.', 404, 'NOT_FOUND'));
    }

    const isLearner = String(req.user._id) === String(conversation.learnerId);
    const readField = isLearner ? 'learnerLastReadAt' : 'mentorLastReadAt';
    const now = new Date();

    await Conversation.updateOne(
      { _id: id },
      { $max: { [readField]: now } }
    );

    const otherId = isLearner ? conversation.mentorId : conversation.learnerId;
    const io = getIo();
    if (io) {
      io.to(`user:${otherId}`).emit('chat:read', {
        conversationId: String(id)
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getChatAccessEndpoint,
  createChat,
  listChats,
  getUnreadCount,
  getChatMessages,
  sendMessage,
  markAsRead
};
