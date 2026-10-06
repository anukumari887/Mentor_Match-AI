const express = require('express');
const recommendationController = require('../controllers/recommendation.controller');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = express.Router();
router.get('/', requireAuth, requireRole('learner'), recommendationController.getRecommendations);

module.exports = router;