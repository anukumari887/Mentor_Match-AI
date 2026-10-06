const Booking = require('../models/Booking');
const FeedbackEvent = require('../models/FeedbackEvent');
const MentorProfile = require('../models/MentorProfile');
const Review = require('../models/Review');
const User = require('../models/User');
const { clearLearnerRecommendations } = require('../services/recommendations/cache');
const { mentorIdSchema } = require('../validations/mentor.validation');
const { reviewCreateSchema, reviewListQuerySchema } = require('../validations/review.validation');
const { AppError } = require('../utils/errors');
const logger = require('../config/logger');

async function createReview(req, res, next) {
  try {
    const { bookingId, rating, comment } = reviewCreateSchema.parse(req.body);
    const booking = await Booking.findOne({
      _id: bookingId,
      learnerId: req.user._id,
      status: 'completed'
    });
    if (!booking) return next(new AppError('Completed session not found.', 404, 'BOOKING_NOT_REVIEWABLE'));
    if (booking.hasReview) return next(new AppError('This session already has a review.', 409, 'REVIEW_EXISTS'));

    let review;
    try {
      review = await Review.create({
        bookingId: booking._id,
        learnerId: req.user._id,
        mentorId: booking.mentorId,
        rating,
        comment
      });
    } catch (error) {
      if (error.code === 11000) return next(new AppError('This session already has a review.', 409, 'REVIEW_EXISTS'));
      throw error;
    }

    await Booking.findOneAndUpdate(
      { _id: booking._id, learnerId: req.user._id, status: 'completed', hasReview: false },
      { $set: { hasReview: true } }
    );
    const [aggregate] = await Review.aggregate([
      { $match: { mentorId: booking.mentorId } },
      { $group: { _id: '$mentorId', ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } }
    ]);
    if (aggregate) {
      await MentorProfile.updateOne(
        { userId: booking.mentorId },
        { $set: { ratingAvg: aggregate.ratingAvg, ratingCount: aggregate.ratingCount } }
      );
    }
    try {
      await FeedbackEvent.create({
        learnerId: req.user._id,
        mentorId: booking.mentorId,
        action: 'rated',
        meta: { bookingId: booking._id, rating }
      });
    } catch (error) {
      logger.warn({ message: error.message }, 'Could not record review feedback event');
    }
    await clearLearnerRecommendations(req.user._id);

    return res.status(201).json({ review });
  } catch (error) {
    return next(error);
  }
}

async function listMentorReviews(req, res, next) {
  try {
    const { id } = mentorIdSchema.parse(req.params);
    const query = reviewListQuerySchema.parse(req.query);
    const profile = await MentorProfile.findOne({ userId: id, approvalStatus: 'approved' }).select('_id').lean();
    const active = await User.exists({ _id: id, role: 'mentor', isActive: true });
    if (!profile || !active) return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));

    const filter = { mentorId: id };
    const skip = (query.page - 1) * query.limit;
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('learnerId', 'name').lean(),
      Review.countDocuments(filter)
    ]);
    return res.status(200).json({
      reviews: reviews.map((review) => ({
        id: String(review._id),
        learnerName: review.learnerId?.name || 'Learner',
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      })),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createReview, listMentorReviews };