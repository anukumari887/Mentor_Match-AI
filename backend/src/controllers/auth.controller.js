const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LearnerProfile = require('../models/LearnerProfile');
const MentorProfile = require('../models/MentorProfile');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { AppError } = require('../utils/errors');

async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, role } = validatedData;

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS'));
    }

    // Hash password with bcryptjs cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user record
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      isActive: true
    });

    // Create corresponding empty profile
    let profile = null;
    if (role === 'learner') {
      profile = await LearnerProfile.create({ userId: user._id });
    } else if (role === 'mentor') {
      profile = await MentorProfile.create({ userId: user._id });
    }

    // Generate JWT and set secure cookie
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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
    }

    // Generate JWT and set cookie
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email
    });
    setAuthCookie(res, token);

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      profile
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
