const User = require('../models/User');
const logger = require('../config/logger');

async function migrateExistingUsersEmailVerification() {
  try {
    const result = await User.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
    );
    logger.info(
      { modifiedCount: result.modifiedCount || 0 },
      `Startup email verification migration completed: ${result.modifiedCount || 0} existing users marked verified`
    );
    return result.modifiedCount || 0;
  } catch (error) {
    logger.warn({ message: error.message }, 'Startup email verification migration encountered an error');
    return 0;
  }
}

module.exports = {
  migrateExistingUsersEmailVerification,
  migrateExistingUsersEmailVerified: migrateExistingUsersEmailVerification
};
