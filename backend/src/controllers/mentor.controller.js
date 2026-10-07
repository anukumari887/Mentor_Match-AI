const MentorProfile = require('../models/MentorProfile');
const User = require('../models/User');
const { mentorQuerySchema, mentorIdSchema } = require('../validations/mentor.validation');
const { AppError } = require('../utils/errors');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSort(sort) {
  const sorts = {
    rating: { ratingAvg: -1, ratingCount: -1, experienceYears: -1 },
    price_asc: { pricePerHour: 1, ratingAvg: -1 },
    price_desc: { pricePerHour: -1, ratingAvg: -1 },
    experience: { experienceYears: -1, ratingAvg: -1 }
  };
  return sorts[sort];
}

function presentMentor(profile) {
  const { _id, userId, ...details } = profile;
  return {
    id: String(userId._id || userId),
    name: userId.name || 'Mentor',
    ...details
  };
}

async function getMentors(req, res, next) {
  try {
    const query = mentorQuerySchema.parse(req.query);
    const activeUserIds = await User.find({ role: 'mentor', isActive: true }).distinct('_id');
    const conditions = [
      { approvalStatus: 'approved' },
      { userId: { $in: activeUserIds } }
    ];

    if (query.q) {
      const expression = new RegExp(escapeRegex(query.q), 'i');
      const matchingNames = await User.find({
        role: 'mentor',
        isActive: true,
        name: expression
      }).distinct('_id');
      conditions.push({
        $or: [
          { headline: expression },
          { bio: expression },
          { skills: expression },
          { userId: { $in: matchingNames } }
        ]
      });
    }

    if (query.skill) conditions.push({ skills: new RegExp(escapeRegex(query.skill), 'i') });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const price = {};
      if (query.minPrice !== undefined) price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) price.$lte = query.maxPrice;
      conditions.push({ pricePerHour: price });
    }
    if (query.minRating !== undefined) conditions.push({ ratingAvg: { $gte: query.minRating } });
    if (query.day !== undefined) conditions.push({ availability: { $elemMatch: { dayOfWeek: query.day } } });

    const filter = { $and: conditions };
    const skip = (query.page - 1) * query.limit;
    const [profiles, total] = await Promise.all([
      MentorProfile.find(filter)
        .sort(getSort(query.sort))
        .skip(skip)
        .limit(query.limit)
        .populate('userId', 'name')
        .lean(),
      MentorProfile.countDocuments(filter)
    ]);

    return res.status(200).json({
      items: profiles.map(presentMentor),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

async function getMentor(req, res, next) {
  try {
    const { id } = mentorIdSchema.parse(req.params);
    const profile = await MentorProfile.findOne({ userId: id, approvalStatus: 'approved' })
      .populate('userId', 'name')
      .lean();
    if (!profile || !profile.userId) {
      return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));
    }

    const activeUser = await User.exists({ _id: id, role: 'mentor', isActive: true });
    if (!activeUser) return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));
    return res.status(200).json({ mentor: presentMentor(profile) });
  } catch (error) {
    return next(error);
  }
}

const { calculateMentorCompleteness, triggerMentorAdminReviewNotification } = require('../utils/completeness');

async function requestReview(req, res, next) {
  try {
    const mentorId = req.user._id;
    const profile = await MentorProfile.findOne({ userId: mentorId });
    if (!profile) {
      return next(new AppError('Mentor profile not found.', 404, 'NOT_FOUND'));
    }

    const completeness = calculateMentorCompleteness(profile);
    if (!completeness.isComplete) {
      return next(new AppError('Please complete all required fields before submitting for review.', 400, 'PROFILE_INCOMPLETE', completeness.missingFields));
    }

    await triggerMentorAdminReviewNotification(mentorId);
    return res.status(200).json({ message: 'Profile submitted for review.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMentors,
  getMentor,
  requestReview,
  escapeRegex,
  getSort
};