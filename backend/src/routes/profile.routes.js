const express = require('express');
const profileController = require('../controllers/profile.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();

// General profile endpoint for learner and mentor
router.get('/profile', requireAuth, requireRole('learner', 'mentor'), profileController.getProfile);
router.put('/profile', requireAuth, requireRole('learner', 'mentor'), profileController.updateProfile);

// Mentor availability windows endpoint
router.get('/mentor/availability', requireAuth, requireRole('mentor'), profileController.getAvailability);
router.put('/mentor/availability', requireAuth, requireRole('mentor'), profileController.updateAvailability);

module.exports = router;
