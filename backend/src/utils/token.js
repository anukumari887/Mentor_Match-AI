const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const COOKIE_NAME = 'token';

// Convert string like "7d" or "24h" to milliseconds
function parseExpiryToMs(expiryStr) {
  if (!expiryStr || typeof expiryStr !== 'string') return 7 * 24 * 60 * 60 * 1000;
  const match = expiryStr.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'm':
      return num * 60 * 1000;
    case 's':
      return num * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function getJwtSecret() {
  return env.JWT_SECRET || 'dev_jwt_secret_must_be_at_least_32_chars_long!';
}

function generateToken(payload) {
  const tokenPayload = {
    ...payload,
    tv: payload.tv !== undefined ? payload.tv : 0
  };
  return jwt.sign(tokenPayload, getJwtSecret(), {
    expiresIn: env.JWT_EXPIRES_IN || '7d'
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function setAuthCookie(res, token) {
  const maxAge = parseExpiryToMs(env.JWT_EXPIRES_IN);
  const isSecure = env.COOKIE_SECURE === true || env.COOKIE_SECURE === 'true';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    maxAge
  });
}

function clearAuthCookie(res) {
  const isSecure = env.COOKIE_SECURE === true || env.COOKIE_SECURE === 'true';

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/'
  });
}

module.exports = {
  COOKIE_NAME,
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie
};
