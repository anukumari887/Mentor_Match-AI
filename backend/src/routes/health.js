const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/database');
const { isRedisConnected, getRedisClient } = require('../config/redis');
const { env } = require('../config/env');
const logger = require('../config/logger');

const router = express.Router();

async function checkMongo() {
  try {
    if (!isMongoConnected || !isMongoConnected()) {
      return 'down';
    }
    if (
      mongoose &&
      mongoose.connection &&
      mongoose.connection.db &&
      typeof mongoose.connection.db.admin === 'function'
    ) {
      let timer;
      const pingPromise = mongoose.connection.db.admin().ping();
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('mongo timeout')), 2000);
        if (timer.unref) timer.unref();
      });
      try {
        await Promise.race([pingPromise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      return 'ok';
    }
    return 'ok';
  } catch (err) {
    logger.debug(`Healthcheck mongo error: ${err.message}`);
    return 'down';
  }
}

async function checkRedis() {
  try {
    if (!isRedisConnected || !isRedisConnected()) {
      return 'down';
    }
    const client = getRedisClient();
    if (!client || typeof client.ping !== 'function') {
      return 'ok';
    }
    let timer;
    const pingPromise = client.ping();
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('redis timeout')), 2000);
      if (timer.unref) timer.unref();
    });
    let pong;
    try {
      pong = await Promise.race([pingPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return pong === 'PONG' || pong === 'ok' ? 'ok' : 'down';
  } catch (err) {
    logger.debug(`Healthcheck redis error: ${err.message}`);
    return 'down';
  }
}

async function checkML() {
  if (!env.ML_SERVICE_URL) {
    return 'disabled';
  }
  try {
    const response = await axios.get(`${env.ML_SERVICE_URL}/health`, {
      timeout: 2000
    });
    return response.status === 200 ? 'ok' : 'down';
  } catch (err) {
    logger.debug(`Healthcheck ML error: ${err.message}`);
    return 'down';
  }
}

async function checkEmail() {
  if (env.EMAIL_MODE === 'demo') {
    return 'demo';
  }
  if (!env.SMTP_HOST) {
    return 'disabled';
  }
  try {
    const { liveTransporter } = require('../services/email');
    if (!liveTransporter || typeof liveTransporter.verify !== 'function') {
      return 'disabled';
    }
    let timer;
    const verifyPromise = liveTransporter.verify();
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('email timeout')), 2000);
      if (timer.unref) timer.unref();
    });
    try {
      await Promise.race([verifyPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return 'ok';
  } catch (err) {
    logger.debug(`Healthcheck email error: ${err.message}`);
    return 'degraded';
  }
}

router.get('/health', async (req, res) => {
  const [mongoStatus, redisStatus, mlStatus, emailStatus] = await Promise.all([
    checkMongo(),
    checkRedis(),
    checkML(),
    checkEmail()
  ]);

  const mongoOk = mongoStatus === 'ok';
  const redisOk = redisStatus === 'ok';

  let overallStatus;
  let statusCode;

  if (!mongoOk || !redisOk) {
    overallStatus = 'down';
    statusCode = 503;
  } else if (mlStatus === 'down' || emailStatus === 'degraded') {
    overallStatus = 'degraded';
    statusCode = 200;
  } else {
    overallStatus = 'ok';
    statusCode = 200;
  }

  return res.status(statusCode).json({
    status: overallStatus,
    mongo: mongoStatus,
    redis: redisStatus,
    ml: mlStatus,
    email: emailStatus
  });
});

module.exports = router;
