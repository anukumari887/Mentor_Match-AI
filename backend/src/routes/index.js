const express = require('express');
const healthRoutes = require('./health');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const mentorRoutes = require('./mentor.routes');
const adminMentorRoutes = require('./adminMentor.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const recommendationRoutes = require('./recommendation.routes');
const reviewRoutes = require('./review.routes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.use('/mentors', mentorRoutes);
router.use('/admin', adminMentorRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
