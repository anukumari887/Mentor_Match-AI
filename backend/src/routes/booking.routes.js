const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', requireRole('learner'), bookingController.createBooking);
router.get('/', requireRole('learner', 'mentor'), bookingController.listBookings);
router.get('/:id/room', requireRole('learner', 'mentor'), bookingController.getRoomDetails);
router.patch('/:id/meeting-link', requireRole('mentor'), bookingController.updateMeetingLink);
router.get('/:id', requireRole('learner', 'mentor'), bookingController.getBooking);
router.patch('/:id/cancel', requireRole('learner', 'mentor'), bookingController.cancelBooking);

module.exports = router;