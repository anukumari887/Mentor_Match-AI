const express = require('express');
const mentorController = require('../controllers/mentor.controller');
const bookingController = require('../controllers/booking.controller');
const reviewController = require('../controllers/review.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireAuth, mentorController.getMentors);
router.get('/:id/slots', requireAuth, bookingController.getMentorSlots);
router.get('/:id/reviews', requireAuth, reviewController.listMentorReviews);
router.get('/:id', requireAuth, mentorController.getMentor);

module.exports = router;