const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../config/logger');

function createLimiter(windowMs, max, message, options = {}) {
  let store;
  try {
    if (isRedisConnected()) {
      const client = getRedisClient();
      if (typeof client?.call === 'function') {
        store = new RedisStore({
          sendCommand: (...args) => client.call(...args),
          prefix: options.prefix || 'rl:'
        });
      } else {
        logger.warn('Redis rate limiter client is unavailable; using the memory store.');
      }
    }
  } catch (err) {
    logger.warn(`Could not initialize RedisStore for rate limiter, falling back to memory: ${err.message}`);
  }

  const config = {
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
  };

  if (options.keyGenerator) {
    config.keyGenerator = options.keyGenerator;
  }

  return rateLimit(config);
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

// 5 attempts per 15 minutes per user for change password
const changePasswordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many password change attempts. Please try again after 15 minutes.',
  {
    prefix: 'rl:cp:',
    keyGenerator: (req) => req.user?._id ? String(req.user._id) : (req.ip || 'unknown')
  }
);

// 5 attempts per 15 minutes per IP for forgot password
const forgotPasswordIpLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many password reset requests from this IP. Please try again after 15 minutes.',
  { prefix: 'rl:fp-ip:' }
);

// 3 attempts per hour per email address for forgot password
const forgotPasswordEmailLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Too many password reset requests for this email address. Please try again after 1 hour.',
  {
    prefix: 'rl:fp-email:',
    keyGenerator: (req) => req.body?.email ? String(req.body.email).toLowerCase().trim() : (req.ip || 'unknown')
  }
);

// 10 attempts per 15 minutes per IP for reset password
const resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many password reset submission attempts. Please try again after 15 minutes.',
  { prefix: 'rl:rp:' }
);

// 20 messages per minute per user for chat
const chatUserLimiter = createLimiter(
  60 * 1000,
  20,
  'You are sending messages too quickly. Please wait a moment.',
  {
    prefix: 'rl:chat-usr:',
    keyGenerator: (req) => req.user?._id ? String(req.user._id) : (req.ip || 'unknown')
  }
);

// 200 messages per day per conversation
const chatConversationLimiter = createLimiter(
  24 * 60 * 60 * 1000,
  200,
  'Daily message limit reached for this conversation. Please continue tomorrow.',
  {
    prefix: 'rl:chat-conv:',
    keyGenerator: (req) => req.params?.id ? String(req.params.id) : (req.ip || 'unknown')
  }
);

module.exports = {
  authLimiter,
  paymentLimiter,
  apiLimiter,
  changePasswordLimiter,
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  resetPasswordLimiter,
  chatUserLimiter,
  chatConversationLimiter
};
