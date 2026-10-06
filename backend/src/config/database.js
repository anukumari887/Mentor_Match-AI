const mongoose = require('mongoose');
const logger = require('./logger');
const { env } = require('./env');

const MAX_RETRIES = 12;
const RETRY_INTERVAL_MS = 5000;

async function connectMongoWithRetry(uri = env.MONGO_URI) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      logger.info(`Connecting to MongoDB at ${uri} (attempt ${attempt}/${MAX_RETRIES})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('Successfully connected to MongoDB');
      return mongoose.connection;
    } catch (err) {
      logger.warn(`MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= MAX_RETRIES) {
        logger.error('Exhausted maximum connection retries to MongoDB. Terminating startup.');
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectMongoWithRetry,
  isMongoConnected,
  mongoose
};
