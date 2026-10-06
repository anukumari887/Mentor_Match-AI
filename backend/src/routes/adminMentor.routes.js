const express = require('express');
const adminMentorController = require('../controllers/adminMentor.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.get('/mentors', adminMentorController.listMentors);
router.patch('/mentors/:id/approve', adminMentorController.approveMentor);
router.patch('/mentors/:id/reject', adminMentorController.rejectMentor);

module.exports = router;