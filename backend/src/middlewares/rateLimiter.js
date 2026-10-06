const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../config/logger');

function createLimiter(windowMs, max, message) {
  let store;
  try {
    if (isRedisConnected()) {
      const client = getRedisClient();
      if (typeof client?.call === 'function') {
        store = new RedisStore({
          sendCommand: (...args) => client.call(...args),
          prefix: 'rl:'
        });
      } else {
        logger.warn('Redis rate limiter client is unavailable; using the memory store.');
      }
    }
  } catch (err) {
    logger.warn(`Could not initialize RedisStore for rate limiter, falling back to memory: ${err.message}`);
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests, please try again later.',
          details: []
        }
      });
    }
  });
}

// 10 attempts per 15 minutes for auth endpoints (register/login)
const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many login/registration attempts from this IP, please try again after 15 minutes.'
);

// 30 per 15 minutes for payments
const paymentLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many payment requests, please try again later.'
);

// 300 per 15 minutes for general API
const apiLimiter = createLimiter(
  15 * 60 * 1000,
  300,
  'Too many requests to the API, please slow down.'
);

module.exports = {
  authLimiter,
  paymentLimiter,
  apiLimiter
};
