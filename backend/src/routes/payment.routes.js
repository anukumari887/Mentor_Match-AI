const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.post('/webhook', paymentController.razorpayWebhook);
router.post('/create-order', requireAuth, requireRole('learner'), paymentController.createOrder);
router.post('/verify', requireAuth, requireRole('learner'), paymentController.verifyPayment);
router.post('/mock/confirm', requireAuth, requireRole('learner'), paymentController.confirmMockPayment);
router.get('/mentor/earnings', requireAuth, requireRole('mentor'), paymentController.getMentorEarnings);

module.exports = router;