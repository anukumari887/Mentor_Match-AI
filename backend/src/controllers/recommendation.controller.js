const crypto = require('node:crypto');
const axios = require('axios');
const LearnerProfile = require('../models/LearnerProfile');
const MentorProfile = require('../models/MentorProfile');
const FeedbackEvent = require('../models/FeedbackEvent');
const User = require('../models/User');
const { env } = require('../config/env');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../config/logger');
const { recommendationQuerySchema } = require('../validations/recommendation.validation');
const { scoreFallback } = require('../services/recommendations/fallbackScorer');

const CACHE_SECONDS = 600;

function learnerCacheHash(profile) {
  const stable = {
    wantedSkills: profile.wantedSkills || [],
    knownSkills: profile.knownSkills || [],
    goals: profile.goals || '',
    level: profile.level || 'beginner',
    budgetPerHour: profile.budgetPerHour || 0,
    availability: profile.availability || []
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function mentorCard(profile) {
  const { userId, ...details } = profile;
  return {
    id: String(userId._id),
    name: userId.name,
    headline: details.headline,
    bio: details.bio,
    skills: details.skills,
    experienceYears: details.experienceYears,
    pricePerHour: details.pricePerHour,
    availability: details.availability,
    timezone: details.timezone,
    ratingAvg: details.ratingAvg,
    ratingCount: details.ratingCount
  };
}

async function getCached(redis, key) {
  if (!redis || !isRedisConnected()) return null;
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn({ message: error.message }, 'Recommendation cache read failed');
    return null;
  }
}

async function cacheResult(redis, key, value) {
  if (!redis || !isRedisConnected()) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_SECONDS);
  } catch (error) {
    logger.warn({ message: error.message }, 'Recommendation cache write failed');
  }
}

async function getRecommendations(req, res, next) {
  try {
    const { limit } = recommendationQuerySchema.parse(req.query);
    const learner = await LearnerProfile.findOne({ userId: req.user._id }).lean();
    if (!learner?.wantedSkills?.length) {
      return res.status(200).json({ source: 'fallback', items: [], reason: 'PROFILE_INCOMPLETE' });
    }

    const redis = isRedisConnected() ? getRedisClient() : null;
    const cacheKey = `rec:${req.user._id}:${learnerCacheHash(learner)}:${limit}`;
    const cached = await getCached(redis, cacheKey);
    if (cached) return res.status(200).json(cached);

    const activeMentorIds = await User.find({ role: 'mentor', isActive: true }).distinct('_id');
    const profiles = await MentorProfile.find({
      approvalStatus: 'approved',
      userId: { $in: activeMentorIds }
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name')
      .lean();
    const mentors = profiles.filter((profile) => profile.userId).map(mentorCard);

    if (!mentors.length) {
      return res.status(200).json({ source: 'fallback', items: [], reason: 'NO_MENTORS' });
    }

    const payload = {
      learner: {
        wantedSkills: learner.wantedSkills || [],
        knownSkills: learner.knownSkills || [],
        goals: learner.goals || '',
        level: learner.level || 'beginner',
        budgetPerHour: learner.budgetPerHour || 0,
        availability: learner.availability || []
      },
      mentors: mentors.map(({ name, timezone, ratingAvg, ratingCount, ...mentor }) => mentor),
      limit
    };

    let source = 'ml';
    let ranked;
    try {
      const response = await axios.post(`${env.ML_SERVICE_URL}/recommend`, payload, { timeout: env.ML_TIMEOUT_MS });
      if (!Array.isArray(response.data?.items)) throw new Error('Invalid ML recommendation response.');
      ranked = response.data.items;
    } catch (error) {
      source = 'fallback';
      logger.warn({ message: error.message }, 'ML recommendation failed; using fallback scorer');
      ranked = scoreFallback(payload.learner, mentors.map(({ name, timezone, ...mentor }) => mentor), limit);
    }

    const profilesById = new Map(mentors.map((mentor) => [mentor.id, mentor]));
    const items = ranked
      .filter((match) => profilesById.has(String(match.id)))
      .map((match) => ({
        mentor: profilesById.get(String(match.id)),
        score: match.score,
        breakdown: match.breakdown,
        reasons: match.reasons || [],
        overBudget: Boolean(match.overBudget)
      }));
    const result = { source, items };

    if (items.length) {
      try {
        await FeedbackEvent.insertMany(items.map((item) => ({
          learnerId: req.user._id,
          mentorId: item.mentor.id,
          action: 'recommended',
          meta: { score: item.score, source }
        })));
      } catch (error) {
        logger.warn({ message: error.message }, 'Could not record recommendation feedback events');
      }
    }

    await cacheResult(redis, cacheKey, result);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRecommendations, learnerCacheHash, mentorCard, CACHE_SECONDS };