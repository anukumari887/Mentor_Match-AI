const express = require('express');
const axios = require('axios');
const { isMongoConnected } = require('../config/database');
const { isRedisConnected } = require('../config/redis');
const { env } = require('../config/env');
const logger = require('../config/logger');

const router = express.Router();

router.get('/health', async (req, res) => {
  const mongoOk = isMongoConnected();
  const redisOk = isRedisConnected();
  let mlStatus = 'down';

  if (env.ML_SERVICE_URL) {
    try {
      const response = await axios.get(`${env.ML_SERVICE_URL}/health`, {
        timeout: 1000
      });
      if (response.status === 200) {
        mlStatus = 'ok';
      }
    } catch (err) {
      logger.debug(`ML service health check failed: ${err.message}`);
      mlStatus = 'down';
    }
  }

  const mongoStatus = mongoOk ? 'ok' : 'down';
  const redisStatus = redisOk ? 'ok' : 'down';

  // Overall status: 200 if mongo and redis ok (ml may be "down" = degraded), else 503
  const isHealthy = mongoOk && redisOk;
  const overallStatus = isHealthy ? (mlStatus === 'ok' ? 'ok' : 'degraded') : 'down';

  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: overallStatus,
    mongo: mongoStatus,
    redis: redisStatus,
    ml: mlStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
