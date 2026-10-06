const { getRedisClient, isRedisConnected } = require('../../config/redis');
const logger = require('../../config/logger');

async function clearLearnerRecommendations(learnerId) {
  if (!isRedisConnected()) return 0;
  try {
    const client = getRedisClient();
    let cursor = '0';
    const keys = [];
    do {
      const [nextCursor, matched] = await client.scan(cursor, 'MATCH', `rec:${learnerId}:*`, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...matched);
    } while (cursor !== '0');
    if (keys.length) await client.del(...keys);
    return keys.length;
  } catch (error) {
    logger.warn({ message: error.message }, 'Recommendation cache invalidation failed');
    return 0;
  }
}

module.exports = { clearLearnerRecommendations };