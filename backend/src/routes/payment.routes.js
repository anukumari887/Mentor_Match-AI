const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { requireAuth, requireRole, requireEmailVerified } = require('../middlewares/auth');

const router = express.Router();

router.post('/webhook', paymentController.razorpayWebhook);
router.post('/create-order', requireAuth, requireRole('learner'), requireEmailVerified, paymentController.createOrder);
router.post('/verify', requireAuth, requireRole('learner'), requireEmailVerified, paymentController.verifyPayment);
router.post('/mock/confirm', requireAuth, requireRole('learner'), requireEmailVerified, paymentController.confirmMockPayment);
router.get('/mentor/earnings', requireAuth, requireRole('mentor'), paymentController.getMentorEarnings);

module.exports = router;