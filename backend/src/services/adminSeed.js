const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { env } = require('../config/env');
const logger = require('../config/logger');

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

async function seedAdminInternal() {
  const normalizedEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!normalizedEmail) {
    logger.warn('ADMIN_EMAIL is empty. Skipping admin bootstrap.');
    return;
  }

  // 1. Check if a user with that email already exists
  const userWithEmail = await User.findOne({ email: normalizedEmail });

  if (userWithEmail) {
    if (userWithEmail.role === 'admin') {
      logger.info('admin account exists');
      return;
    } else {
      logger.error('ADMIN_EMAIL belongs to a non-admin account; use another email or run admin:reset');
      return;
    }
  }

  // 2. Check if an admin exists with a different email
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    logger.warn(
      'An admin exists with a different email than ADMIN_EMAIL. ADMIN_EMAIL and ADMIN_PASSWORD only apply when the first admin is created. Run admin:check, or admin:reset to change the password.'
    );
    return;
  }

  // 3. No user with that email and no admin exists: create admin
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

  await User.create({
    name: 'System Admin',
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    emailVerifiedVia: 'bootstrap',
    tokenVersion: 0
  });

  logger.info(`admin account created: ${maskEmail(normalizedEmail)}`);
}

async function ensureAdminUser() {
  let attempt = 0;
  while (attempt < 2) {
    attempt++;
    try {
      await seedAdminInternal();
      return;
    } catch (err) {
      if (attempt < 2) {
        logger.warn(`Admin bootstrap attempt 1 failed: ${err.message}. Retrying once...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        logger.error(`Admin bootstrap failed after retry: ${err.message}`);
        throw err;
      }
    }
  }
}

module.exports = {
  ensureAdminUser,
  maskEmail,
  seedAdminInternal
};
