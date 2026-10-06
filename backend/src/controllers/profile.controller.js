const LearnerProfile = require('../models/LearnerProfile');
const MentorProfile = require('../models/MentorProfile');
const {
  learnerProfileUpdateSchema,
  mentorProfileUpdateSchema,
  availabilityUpdateSchema
} = require('../validations/profile.validation');
const { AppError } = require('../utils/errors');
const { clearLearnerRecommendations } = require('../services/recommendations/cache');

async function getProfile(req, res, next) {
  try {
    const { _id, role } = req.user;
    let profile;

    if (role === 'learner') {
      profile = await LearnerProfile.findOne({ userId: _id });
      if (!profile) {
        profile = await LearnerProfile.create({ userId: _id });
      }
    } else if (role === 'mentor') {
      profile = await MentorProfile.findOne({ userId: _id });
      if (!profile) {
        profile = await MentorProfile.create({ userId: _id });
      }
    } else {
      return next(new AppError('Admin users do not have a mentor/learner profile.', 400, 'NO_PROFILE'));
    }

    return res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { _id, role } = req.user;
    let updatedProfile;

    if (role === 'learner') {
      const validatedData = learnerProfileUpdateSchema.parse(req.body);
      updatedProfile = await LearnerProfile.findOneAndUpdate(
        { userId: _id },
        { $set: validatedData },
        { new: true, upsert: true, runValidators: true }
      );
      await clearLearnerRecommendations(_id);
    } else if (role === 'mentor') {
      const validatedData = mentorProfileUpdateSchema.parse(req.body);
      updatedProfile = await MentorProfile.findOneAndUpdate(
        { userId: _id },
        { $set: validatedData },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      return next(new AppError('Admins cannot update learner/mentor profiles.', 400, 'INVALID_ROLE'));
    }

    return res.status(200).json({ profile: updatedProfile });
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const mentorProfile = await MentorProfile.findOne({ userId: req.user._id });
    if (!mentorProfile) {
      return next(new AppError('Mentor profile not found.', 404, 'NOT_FOUND'));
    }

    return res.status(200).json({
      availability: mentorProfile.availability,
      timezone: mentorProfile.timezone
    });
  } catch (err) {
    next(err);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const validatedData = availabilityUpdateSchema.parse(req.body);
    const mentorProfile = await MentorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { availability: validatedData.availability } },
      { new: true, runValidators: true }
    );

    if (!mentorProfile) {
      return next(new AppError('Mentor profile not found.', 404, 'NOT_FOUND'));
    }

    return res.status(200).json({
      availability: mentorProfile.availability,
      timezone: mentorProfile.timezone
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAvailability,
  updateAvailability
};
