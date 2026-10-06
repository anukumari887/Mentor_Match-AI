jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../src/models/LearnerProfile', () => ({ findOne: jest.fn() }));
jest.mock('../src/models/MentorProfile', () => ({ find: jest.fn() }));
jest.mock('../src/models/FeedbackEvent', () => ({ insertMany: jest.fn() }));
jest.mock('../src/models/User', () => ({ find: jest.fn() }));
jest.mock('../src/config/env', () => ({ env: {
  ML_SERVICE_URL: 'http://ml-service:8000',
  ML_TIMEOUT_MS: 2000
} }));
jest.mock('../src/config/redis', () => ({ getRedisClient: jest.fn(), isRedisConnected: jest.fn() }));

const axios = require('axios');
const LearnerProfile = require('../src/models/LearnerProfile');
const MentorProfile = require('../src/models/MentorProfile');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const User = require('../src/models/User');
const { getRedisClient, isRedisConnected } = require('../src/config/redis');
const recommendationController = require('../src/controllers/recommendation.controller');
const { scoreFallback } = require('../src/services/recommendations/fallbackScorer');

function createResponse() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

function profile(userId, name, skills, pricePerHour = 500) {
  return {
    userId: { _id: userId, name },
    headline: `${name} mentor`,
    bio: 'Practical career guidance',
    skills,
    experienceYears: 8,
    pricePerHour,
    availability: [],
    timezone: 'Asia/Kolkata',
    ratingAvg: 4.5,
    ratingCount: 5
  };
}

function setupCandidateQueries(profiles) {
  User.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(profiles.map((item) => item.userId._id)) });
  MentorProfile.find.mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(profiles)
  });
  FeedbackEvent.insertMany.mockResolvedValue([]);
}

describe('Recommendation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isRedisConnected.mockReturnValue(false);
  });

  it('fallback scorer ranks matching skills and applies budget penalty', () => {
    const learner = { wantedSkills: ['ml', 'python'], budgetPerHour: 500 };
    const result = scoreFallback(learner, [
      { id: 'match', skills: ['Machine Learning', 'Python'], pricePerHour: 400, ratingAvg: 0, ratingCount: 0, experienceYears: 4 },
      { id: 'over', skills: ['Machine Learning', 'Python'], pricePerHour: 1000, ratingAvg: 0, ratingCount: 0, experienceYears: 4 }
    ], 5);

    expect(result[0].id).toBe('match');
    expect(result[0].breakdown.skill).toBe(1);
    expect(result[1].overBudget).toBe(true);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('returns profile-incomplete state without calling ML', async () => {
    LearnerProfile.findOne.mockReturnValue({ lean: async () => ({ wantedSkills: [] }) });
    const res = createResponse();

    await recommendationController.getRecommendations({ user: { _id: 'learner-id' }, query: {} }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ source: 'fallback', items: [], reason: 'PROFILE_INCOMPLETE' });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('uses fallback on ML failure and records recommendation feedback', async () => {
    const learner = { wantedSkills: ['Python'], knownSkills: [], goals: 'Learn data science', level: 'beginner', budgetPerHour: 800, availability: [] };
    const profiles = [profile('mentor-1', 'Asha', ['Python', 'Data Science'])];
    LearnerProfile.findOne.mockReturnValue({ lean: async () => learner });
    setupCandidateQueries(profiles);
    axios.post.mockRejectedValue(new Error('ML service timeout'));
    const res = createResponse();
    const next = jest.fn();

    await recommendationController.getRecommendations({ user: { _id: 'learner-id' }, query: { limit: '5' } }, res, next);

    const result = res.json.mock.calls[0][0];
    expect(result.source).toBe('fallback');
    expect(result.items[0].mentor.name).toBe('Asha');
    expect(result.items[0].reasons.length).toBeGreaterThan(0);
    expect(FeedbackEvent.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ learnerId: 'learner-id', mentorId: 'mentor-1', action: 'recommended' })
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  it('serves cached recommendations without querying mentors or ML', async () => {
    const cached = { source: 'ml', items: [{ score: 0.9 }] };
    LearnerProfile.findOne.mockReturnValue({ lean: async () => ({ wantedSkills: ['Python'] }) });
    isRedisConnected.mockReturnValue(true);
    getRedisClient.mockReturnValue({ get: jest.fn().mockResolvedValue(JSON.stringify(cached)) });
    const res = createResponse();

    await recommendationController.getRecommendations({ user: { _id: 'learner-id' }, query: {} }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(cached);
    expect(MentorProfile.find).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});