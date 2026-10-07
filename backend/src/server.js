const http = require('http');
const app = require('./app');
const { env } = require('./config/env');
const logger = require('./config/logger');
const { connectMongoWithRetry, mongoose } = require('./config/database');
const { connectRedisWithRetry, getRedisClient } = require('./config/redis');
const { ensureAdminUser } = require('./services/adminSeed');
const { migrateExistingUsersEmailVerification } = require('./services/userMigration');
const { startBookingJobs, stopBookingJobs } = require('./services/bookingJobs');
const { createVideoServer } = require('./socket/video');

const server = http.createServer(app);
let io;

async function startServer() {
  try {
    logger.info(`Starting Mentor-Match AI backend in ${env.NODE_ENV} mode...`);

    // 1. Connect to MongoDB with retry
    await connectMongoWithRetry();

    // 2. Seed initial admin user if not already present
    await ensureAdminUser();

    // 2b. Migrate existing users for email verification
    await migrateExistingUsersEmailVerification();

    // 3. Connect to Redis with retry
    await connectRedisWithRetry();

    // 4. Start expiry processing for pending booking holds
    startBookingJobs();

    // 5. Attach authenticated session signaling to the backend HTTP server
    io = createVideoServer(server);

    // 6. Start listening on configured port
    server.listen(env.PORT, () => {
      logger.info(`Backend server successfully listening on port ${env.PORT}`);
    });
  } catch (err) {
    logger.error(`Critical server startup error: ${err.message}`);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Commencing graceful shutdown...`);
  stopBookingJobs();

  const closeServer = (callback) => {
    if (io) io.close(callback);
    else server.close(callback);
  };

  closeServer(async () => {
    logger.info('HTTP server closed.');

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');
      }
    } catch (err) {
      logger.error(`Error closing MongoDB: ${err.message}`);
    }

    try {
      const redis = getRedisClient();
      if (redis && redis.status !== 'end') {
        await redis.quit();
        logger.info('Redis connection closed.');
      }
    } catch (err) {
      logger.error(`Error closing Redis: ${err.message}`);
    }

    logger.info('Graceful shutdown complete.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process due to shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  startServer,
  get io() { return io; }
};
