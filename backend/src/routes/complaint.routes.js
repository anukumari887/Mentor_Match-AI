const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', complaintController.createComplaint);

module.exports = router;
