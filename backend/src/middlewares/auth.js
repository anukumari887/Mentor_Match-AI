const { verifyToken, COOKIE_NAME } = require('../utils/token');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

async function requireAuth(req, res, next) {
  try {
    let token = req.cookies ? req.cookies[COOKIE_NAME] : null;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(new AppError('Invalid or expired authentication session.', 401, 'UNAUTHORIZED'));
    }

    // Verify user exists and is active directly against the database
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User account not found.', 401, 'UNAUTHORIZED'));
    }

    if (!user.isActive) {
      return next(new AppError('User account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    const tokenVersion = decoded.tv !== undefined ? decoded.tv : 0;
    const currentVersion = user.tokenVersion || 0;
    if (tokenVersion !== currentVersion) {
      return next(new AppError('Invalid or expired authentication session.', 401, 'UNAUTHORIZED'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
      );
    }

    next();
  };
}

function requireEmailVerified(req, res, next) {
  const { env } = require('../config/env');
  if (env.EMAIL_MODE === 'demo') {
    return next();
  }
  const isRequired = env.EMAIL_VERIFICATION_REQUIRED !== false && env.EMAIL_VERIFICATION_REQUIRED !== 'false';
  if (!isRequired) {
    return next();
  }
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (!req.user.emailVerified) {
    return next(
      new AppError(
        'Please verify your email address to continue.',
        403,
        'EMAIL_NOT_VERIFIED'
      )
    );
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireEmailVerified
};
