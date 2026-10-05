const express = require('express');
const { register } = require('../utils/metrics');
const { env } = require('../config/env');

const router = express.Router();

router.get('/metrics', async (req, res) => {
  if (env.METRICS_TOKEN) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== env.METRICS_TOKEN) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing metrics token.',
          details: []
        }
      });
    }
  }

  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

module.exports = router;
