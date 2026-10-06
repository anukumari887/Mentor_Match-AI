const express = require('express');
const reviewController = require('../controllers/review.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.post('/', requireAuth, requireRole('learner'), reviewController.createReview);

module.exports = router;