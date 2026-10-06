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

module.exports = {
  requireAuth,
  requireRole
};
