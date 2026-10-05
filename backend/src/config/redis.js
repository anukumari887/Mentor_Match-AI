const Redis = require('ioredis');
const logger = require('./logger');
const { env } = require('./env');

let redisClient = null;
let isConnected = false;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 20) {
          logger.error('Redis retry strategy exhausted after 20 attempts.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 5000);
        logger.warn(`Retrying Redis connection in ${delay}ms (attempt ${times})...`);
        return delay;
      },
      lazyConnect: true
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Connected to Redis');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      logger.warn(`Redis connection error: ${err.message}`);
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });
  }
  return redisClient;
}

async function connectRedisWithRetry() {
  const client = getRedisClient();
  let attempt = 0;
  const maxAttempts = 12;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      logger.info(`Connecting to Redis at ${env.REDIS_URL} (attempt ${attempt}/${maxAttempts})...`);
      await client.connect();
      await client.ping();
      isConnected = true;
      logger.info('Successfully verified Redis connection with PING');
      return client;
    } catch (err) {
      logger.warn(`Redis connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxAttempts) {
        logger.warn('Failed to establish initial Redis connection. Continuing in degraded mode.');
        return client;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return client;
}

function isRedisConnected() {
  return isConnected && redisClient && redisClient.status === 'ready';
}

module.exports = {
  getRedisClient,
  connectRedisWithRetry,
  isRedisConnected
};
