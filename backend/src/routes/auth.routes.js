const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth');
const {
  authLimiter,
  changePasswordLimiter,
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter
} = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

// Email verification
router.post('/verify-email', verifyEmailLimiter, authController.verifyEmail);
router.post(
  '/resend-verification',
  (req, res, next) => {
    const { env } = require('../config/env');
    if (env.EMAIL_MODE === 'demo') {
      return res.status(200).json({
        message: 'Email verification is turned off in demo mode.'
      });
    }
    next();
  },
  requireAuth,
  resendVerificationLimiter,
  authController.resendVerification
);

// Password settings & lifecycle
router.post('/change-password', requireAuth, changePasswordLimiter, authController.changePassword);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.post('/forgot-password', forgotPasswordIpLimiter, forgotPasswordEmailLimiter, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

module.exports = router;
