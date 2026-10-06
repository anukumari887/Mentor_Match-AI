const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// Platform Stats
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUserStatus);

// Mentor Approvals
router.get('/mentors', adminController.listMentors);
router.patch('/mentors/:id/approve', adminController.approveMentor);
router.patch('/mentors/:id/reject', adminController.rejectMentor);

// Bookings
router.get('/bookings', adminController.listBookings);

// Payments & Refunds
router.get('/payments', adminController.listPayments);
router.patch('/payments/:id/mark-refunded', adminController.markPaymentRefunded);

// Payouts
router.get('/payouts-summary', adminController.getPayoutsSummary);
router.post('/payouts', adminController.recordPayout);
router.get('/payouts', adminController.listPayouts);

// Complaints
router.get('/complaints', adminController.listComplaints);
router.patch('/complaints/:id', adminController.resolveComplaint);

module.exports = router;
