const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireAuth, requireRole, requireEmailVerified } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', requireRole('learner'), requireEmailVerified, bookingController.createBooking);
router.get('/', requireRole('learner', 'mentor'), bookingController.listBookings);
router.get('/:id/room', requireRole('learner', 'mentor'), bookingController.getRoomDetails);
router.get('/:id/calendar.ics', requireRole('learner', 'mentor'), bookingController.getBookingCalendarIcs);
router.patch('/:id/meeting-link', requireRole('mentor'), bookingController.updateMeetingLink);
router.get('/:id', requireRole('learner', 'mentor'), bookingController.getBooking);
router.patch('/:id/cancel', requireRole('learner', 'mentor'), bookingController.cancelBooking);

module.exports = router;