const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { env } = require('../config/env');
const logger = require('../config/logger');

async function ensureAdminUser() {
  try {
    const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (!existingAdmin) {
      logger.info(`Admin user not found. Creating default admin for ${env.ADMIN_EMAIL}...`);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

      await User.create({
        name: 'System Admin',
        email: env.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin',
        isActive: true
      });
      logger.info(`Default admin user successfully created: ${env.ADMIN_EMAIL}`);
    } else {
      logger.debug('Admin user already exists.');
    }
  } catch (err) {
    logger.error(`Error verifying/seeding admin user: ${err.message}`);
  }
}

module.exports = {
  ensureAdminUser
};
