const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LearnerProfile = require('../models/LearnerProfile');
const MentorProfile = require('../models/MentorProfile');
const PasswordReset = require('../models/PasswordReset');
const EmailVerification = require('../models/EmailVerification');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const { formatMentorProfile, triggerMentorAdminReviewNotification } = require('../utils/completeness');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
} = require('../validations/auth.validation');
const {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} = require('../services/email');
const { validateRegistrationEmail } = require('../utils/emailValidation');
const { AppError } = require('../utils/errors');
const { env } = require('../config/env');
const logger = require('../config/logger');

async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, role } = validatedData;

    // Production-only DNS MX check and disposable email blocklist
    await validateRegistrationEmail(email, process.env.NODE_ENV === 'production');

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS'));
    }

    // Hash password with bcryptjs cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    const isDemo = env.EMAIL_MODE === 'demo';
    const now = new Date();

    // Create user record
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true,
      tokenVersion: 0,
      emailVerified: isDemo ? true : false,
      ...(isDemo ? { emailVerifiedAt: now, emailVerifiedVia: 'demo' } : {})
    });

    // Create corresponding empty profile
    let profile = null;
    if (role === 'learner') {
      profile = await LearnerProfile.create({ userId: user._id });
    } else if (role === 'mentor') {
      profile = await MentorProfile.create({ userId: user._id });
      profile = formatMentorProfile(profile);
    }

    if (!isDemo) {
      // Issue email verification token (32 bytes hex, stored only as SHA-256 hash)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await EmailVerification.create({
        userId: user._id,
        tokenHash,
        expiresAt
      });

      // Send verification email in background; never block registration if email fails
      sendVerificationEmail(user, verificationToken).catch((error) => {
        logger.warn({ message: error.message }, 'Failed to send verification email on registration');
      });
    }

    // Generate JWT and set secure cookie
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      tv: user.tokenVersion || 0
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: isDemo ? true : false
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Lookup user
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (!user.isActive) {
      return next(new AppError('User account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    // Fetch user profile
    let profile = null;
    if (user.role === 'learner') {
      profile = await LearnerProfile.findOne({ userId: user._id });
    } else if (user.role === 'mentor') {
      profile = await MentorProfile.findOne({ userId: user._id });
      profile = formatMentorProfile(profile);
    }

    // Generate JWT and set cookie
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      tv: user.tokenVersion || 0
    });
    setAuthCookie(res, token);

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerified)
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'learner') {
      profile = await LearnerProfile.findOne({ userId: user._id });
    } else if (user.role === 'mentor') {
      profile = await MentorProfile.findOne({ userId: user._id });
      profile = formatMentorProfile(profile);
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerified)
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    // Check current password
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'The current password you entered is incorrect.',
          details: []
        }
      });
    }

    // Ensure new password differs from current password
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({
        error: {
          code: 'SAME_PASSWORD',
          message: 'Your new password must be different from your current password.',
          details: []
        }
      });
    }

    // Update password hash, increment tokenVersion and set passwordChangedAt
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = new Date();
    await user.save();

    // Issue a NEW cookie for the current session with updated tv
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      tv: user.tokenVersion
    });
    setAuthCookie(res, token);

    // Send security notification email in background
    sendPasswordChangedEmail(user).catch((error) => {
      logger.warn({ message: error.message }, 'Failed to send password changed email');
    });

    return res.status(200).json({
      message: 'Password changed successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    clearAuthCookie(res);
    return res.status(200).json({
      message: 'Logged out of all devices successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Always send response in constant manner without timing side-channel
    const sendGenericResponse = () => {
      return res.status(200).json({
        message: 'If an account exists for that email, we have sent a reset link.'
      });
    };

    // Find active user
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return sendGenericResponse();
    }

    // Perform token creation and email dispatch asynchronously in background
    setImmediate(async () => {
      try {
        // Delete earlier unused reset tokens for this user
        await PasswordReset.deleteMany({ userId: user._id, usedAt: null });

        // Generate 32 bytes cryptographically secure random token (64 hex characters)
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await PasswordReset.create({
          userId: user._id,
          tokenHash,
          expiresAt
        });

        await sendPasswordResetEmail(user, token);
      } catch (err) {
        logger.warn({ message: err.message }, 'Failed during background password reset processing');
      }
    });

    return sendGenericResponse();
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await PasswordReset.findOne({ tokenHash });

    const now = new Date();
    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < now) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This password reset link is invalid or has expired. Please request a new one.',
          details: []
        }
      });
    }

    const user = await User.findOne({ _id: resetRecord.userId, isActive: true });
    if (!user) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This password reset link is invalid or has expired. Please request a new one.',
          details: []
        }
      });
    }

    // Set new password, bump tokenVersion, set timestamp
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = now;
    await user.save();

    // Mark current reset token used
    resetRecord.usedAt = now;
    await resetRecord.save();

    // Clean up all other reset records for this user
    await PasswordReset.deleteMany({ userId: user._id, _id: { $ne: resetRecord._id } });

    // Send confirmation email
    sendPasswordChangedEmail(user).catch((error) => {
      logger.warn({ message: error.message }, 'Failed to send password changed email after reset');
    });

    return res.status(200).json({
      message: 'Your password has been reset successfully. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    if (env.EMAIL_MODE === 'demo') {
      return res.status(200).json({
        message: 'Email verification is turned off in demo mode.'
      });
    }

    const { token } = verifyEmailSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await EmailVerification.findOne({ tokenHash });
    const now = new Date();

    if (!record || record.usedAt || record.expiresAt < now) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This verification link is invalid or has expired. Please request a new one.',
          details: []
        }
      });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'This verification link is invalid or has expired. Please request a new one.',
          details: []
        }
      });
    }

    // Mark token used
    record.usedAt = now;
    await record.save();

    // Update user if not yet verified
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = now;
      await user.save();

      // If mentor, trigger admin notification if profile is complete and not yet notified
      if (user.role === 'mentor') {
        try {
          await triggerMentorAdminReviewNotification(user._id);
        } catch (err) {
          logger.warn({ err: err.message }, 'Failed to trigger mentor review notification upon email verification');
        }
      }
    }

    return res.status(200).json({
      message: 'Email verified successfully.'
    });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    if (env.EMAIL_MODE === 'demo') {
      return res.status(200).json({
        message: 'Email verification is turned off in demo mode.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    // If already verified, succeed quietly with standard message
    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Verification link sent. Please check your inbox.'
      });
    }

    // 60-second wait between sends
    const recent = await EmailVerification.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (recent && (Date.now() - recent.createdAt.getTime() < 60000)) {
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Please wait before requesting another verification email.',
          details: []
        }
      });
    }

    // Delete earlier unused tokens
    await EmailVerification.deleteMany({ userId: user._id, usedAt: null });

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await EmailVerification.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    sendVerificationEmail(user, token).catch((error) => {
      logger.warn({ message: error.message }, 'Failed to resend verification email');
    });

    return res.status(200).json({
      message: 'Verification link sent. Please check your inbox.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  logoutAll,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
};
