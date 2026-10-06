jest.mock('../src/models/Booking', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../src/models/FeedbackEvent', () => ({ create: jest.fn() }));
jest.mock('../src/models/MentorProfile', () => ({ findOne: jest.fn(), updateOne: jest.fn() }));
jest.mock('../src/models/Review', () => ({ create: jest.fn(), aggregate: jest.fn(), find: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../src/models/User', () => ({ exists: jest.fn() }));
jest.mock('../src/services/recommendations/cache', () => ({ clearLearnerRecommendations: jest.fn() }));

const Booking = require('../src/models/Booking');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const MentorProfile = require('../src/models/MentorProfile');
const Review = require('../src/models/Review');
const User = require('../src/models/User');
const { clearLearnerRecommendations } = require('../src/services/recommendations/cache');
const reviewController = require('../src/controllers/review.controller');

function createResponse() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('Review flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only accepts completed bookings owned by the learner', async () => {
    Booking.findOne.mockResolvedValue(null);
    const next = jest.fn();

    await reviewController.createReview({
      body: { bookingId: '507f1f77bcf86cd799439011', rating: 5, comment: 'Great session' },
      user: { _id: 'learner-id' }
    }, createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, code: 'BOOKING_NOT_REVIEWABLE' }));
    expect(Review.create).not.toHaveBeenCalled();
  });

  it('recomputes mentor ratings and invalidates learner recommendation cache', async () => {
    const booking = { _id: '507f1f77bcf86cd799439011', learnerId: 'learner-id', mentorId: 'mentor-id', hasReview: false };
    const review = { _id: 'review-id', bookingId: booking._id, rating: 5 };
    Booking.findOne.mockResolvedValue(booking);
    Review.create.mockResolvedValue(review);
    Booking.findOneAndUpdate.mockResolvedValue({ ...booking, hasReview: true });
    Review.aggregate.mockResolvedValue([{ ratingAvg: 4.5, ratingCount: 2 }]);
    MentorProfile.updateOne.mockResolvedValue({ modifiedCount: 1 });
    FeedbackEvent.create.mockResolvedValue({});
    clearLearnerRecommendations.mockResolvedValue(1);
    const res = createResponse();
    const next = jest.fn();

    await reviewController.createReview({
      body: { bookingId: booking._id, rating: 5, comment: ' Clear and useful. ' },
      user: { _id: 'learner-id' }
    }, res, next);

    expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: booking._id,
      learnerId: 'learner-id',
      mentorId: 'mentor-id',
      rating: 5,
      comment: 'Clear and useful.'
    }));
    expect(MentorProfile.updateOne).toHaveBeenCalledWith(
      { userId: 'mentor-id' },
      { $set: { ratingAvg: 4.5, ratingCount: 2 } }
    );
    expect(FeedbackEvent.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'rated' }));
    expect(clearLearnerRecommendations).toHaveBeenCalledWith('learner-id');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a second review for a completed booking', async () => {
    Booking.findOne.mockResolvedValue({ _id: 'booking-id', hasReview: true });
    const next = jest.fn();

    await reviewController.createReview({
      body: { bookingId: '507f1f77bcf86cd799439011', rating: 4, comment: '' },
      user: { _id: 'learner-id' }
    }, createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, code: 'REVIEW_EXISTS' }));
    expect(Review.create).not.toHaveBeenCalled();
  });

  it('lists reviews with learner names and pagination metadata', async () => {
    MentorProfile.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ _id: 'profile-id' }) }) });
    User.exists.mockResolvedValue(true);
    const review = { _id: 'review-id', learnerId: { name: 'Diya Shah' }, rating: 5, comment: 'Helpful', createdAt: new Date() };
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([review])
    };
    Review.find.mockReturnValue(query);
    Review.countDocuments.mockResolvedValue(1);
    const res = createResponse();

    await reviewController.listMentorReviews({
      params: { id: '507f1f77bcf86cd799439011' }, query: { page: '1', limit: '10' }
    }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      reviews: [expect.objectContaining({ learnerName: 'Diya Shah', rating: 5 })],
      total: 1,
      pages: 1
    }));
  });
});