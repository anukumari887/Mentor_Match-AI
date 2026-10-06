const express = require('express');
const chatController = require('../controllers/chat.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { chatUserLimiter, chatConversationLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(requireAuth);

router.get('/access', requireRole('learner'), chatController.getChatAccessEndpoint);
router.post('/', requireRole('learner'), chatController.createChat);
router.get('/unread-count', requireRole('learner', 'mentor'), chatController.getUnreadCount);
router.get('/', requireRole('learner', 'mentor'), chatController.listChats);
router.get('/:id/messages', requireRole('learner', 'mentor'), chatController.getChatMessages);
router.post(
  '/:id/messages',
  requireRole('learner', 'mentor'),
  chatUserLimiter,
  chatConversationLimiter,
  chatController.sendMessage
);
router.post('/:id/read', requireRole('learner', 'mentor'), chatController.markAsRead);

module.exports = router;
