#!/usr/bin/env node
const mongoose = require('mongoose');
const Redis = require('ioredis');
const bcrypt = require('bcryptjs');

// Must be run with container environment variables
if (!process.env.MONGO_URI && !process.env.REDIS_URL) {
  console.error('PROBLEM: Refusing to run outside container environment (MONGO_URI/REDIS_URL not set).');
  process.exit(1);
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

function hasHiddenChars(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.includes('\r') || str.includes('\n')) return true;
  if (str !== str.trim()) return true;
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) return true;
  if (str.includes('$')) return true;
  return false;
}

function hasUnencodedUrlChars(str) {
  if (!str || typeof str !== 'string') return false;
  return /[@:#/?]/.test(str);
}

function extractPasswordFromUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  try {
    const parsed = new URL(uri);
    return parsed.password ? decodeURIComponent(parsed.password) : '';
  } catch {
    return '';
  }
}

async function runCheck() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const emailMode = process.env.EMAIL_MODE || 'demo';
  const adminEmail = process.env.ADMIN_EMAIL || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const mongoUri = process.env.MONGO_URI || '';
  const redisUrl = process.env.REDIS_URL || '';

  // 1. Environment configuration flags
  const envFlagsSet = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  console.log(
    `Environment flags: NODE_ENV=${nodeEnv}, EMAIL_MODE=${emailMode}, ADMIN_EMAIL=${adminEmail ? 'set' : 'not set'}, ADMIN_PASSWORD=${adminPassword ? 'set' : 'not set'} - ${envFlagsSet ? 'OK' : 'PROBLEM (missing admin credentials in environment)'}`
  );

  // 2. Hidden characters in ADMIN_EMAIL / ADMIN_PASSWORD
  const emailHidden = hasHiddenChars(adminEmail);
  console.log(
    `Hidden characters in ADMIN_EMAIL (carriage return, spaces, quotes, $): ${emailHidden ? 'yes' : 'no'} - ${emailHidden ? 'PROBLEM (clean spaces or Windows line endings in .env)' : 'OK'}`
  );

  const passHidden = hasHiddenChars(adminPassword);
  console.log(
    `Hidden characters in ADMIN_PASSWORD (carriage return, spaces, quotes, $): ${passHidden ? 'yes' : 'no'} - ${passHidden ? 'PROBLEM (clean spaces, quotes, $, or Windows line endings in .env)' : 'OK'}`
  );

  // 3. MongoDB connection and login
  let mongoOk = false;
  let mongoErrType = '';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    mongoOk = mongoose.connection.readyState === 1;
  } catch (err) {
    mongoOk = false;
    mongoErrType = err.name || 'MongoConnectionError';
  }

  if (mongoOk) {
    console.log('MongoDB connection and login: OK');
  } else {
    console.log(`MongoDB connection and login: PROBLEM (${mongoErrType || 'ConnectionFailed'}) - hint: check database container status and credentials`);
  }

  // 4. Redis connection and login
  let redisOk = false;
  let redisErrType = '';
  let redisClient = null;
  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000
    });
    await redisClient.connect();
    const pong = await redisClient.ping();
    redisOk = pong === 'PONG';
  } catch (err) {
    redisOk = false;
    redisErrType = err.message && err.message.includes('NOAUTH') ? 'AuthenticationError' : err.name || 'RedisConnectionError';
  } finally {
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch {}
    }
  }

  if (redisOk) {
    console.log('Redis connection and login: OK');
  } else {
    console.log(`Redis connection and login: PROBLEM (${redisErrType || 'ConnectionFailed'}) - hint: check cache container status and password`);
  }

  // 5. URL-breaking characters in Mongo or Redis password
  const mongoPass = process.env.MONGO_PASSWORD || extractPasswordFromUri(mongoUri);
  const redisPass = process.env.REDIS_PASSWORD || extractPasswordFromUri(redisUrl);
  const urlBreaking = hasUnencodedUrlChars(mongoPass) || hasUnencodedUrlChars(redisPass);
  console.log(
    `URL-breaking character in database password not encoded: ${urlBreaking ? 'yes' : 'no'} - ${urlBreaking ? 'PROBLEM (passwords should be hex-only or percent-encoded)' : 'OK'}`
  );

  // 6. Admin accounts in database
  if (mongoOk) {
    const User = require('../src/models/User');
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const normalizedEmail = adminEmail.trim().toLowerCase();
    const targetUser = await User.findOne({ email: normalizedEmail });

    if (targetUser) {
      const isRoleAdmin = targetUser.role === 'admin';
      console.log(
        `Admin accounts: count=${totalAdmins}, target account exists=yes, role=${targetUser.role}, isActive=${targetUser.isActive}, emailVerified=${targetUser.emailVerified}, email=${maskEmail(targetUser.email)} - ${isRoleAdmin ? 'OK' : 'PROBLEM (account is not an admin)'}`
      );

      // 7. Password match comparison
      if (adminPassword) {
        const isMatch = await bcrypt.compare(adminPassword, targetUser.passwordHash);
        if (isMatch) {
          console.log('ADMIN_PASSWORD matches stored hash: MATCH - OK');
        } else {
          console.log('ADMIN_PASSWORD matches stored hash: NO MATCH - PROBLEM (password in environment does not match stored hash)');
        }
      } else {
        console.log('ADMIN_PASSWORD matches stored hash: NO MATCH - PROBLEM (ADMIN_PASSWORD is empty in environment)');
      }
    } else {
      console.log(
        `Admin accounts: count=${totalAdmins}, target account exists=no, role=none, isActive=false, emailVerified=false, email=${maskEmail(normalizedEmail)} - PROBLEM (no account exists with email ADMIN_EMAIL)`
      );
      console.log('ADMIN_PASSWORD matches stored hash: NO MATCH - PROBLEM (target account does not exist in database)');
    }
  } else {
    console.log('Admin accounts: PROBLEM (cannot query database while MongoDB is down)');
    console.log('ADMIN_PASSWORD matches stored hash: NO MATCH - PROBLEM (cannot verify without MongoDB)');
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

runCheck().catch((err) => {
  console.error(`Check failed with unexpected error: ${err.message}`);
  process.exit(1);
});
