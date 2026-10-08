#!/usr/bin/env node
const readline = require('readline');
const { Writable } = require('stream');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Must be run inside the container environment
if (!process.env.MONGO_URI) {
  console.error('Refusing to run outside container environment (MONGO_URI not set).');
  process.exit(1);
}

// Never accept password as a command-line argument
const args = process.argv.slice(2);
const allowedModes = ['--from-env'];
if (args.length > 0 && (args.length !== 1 || !allowedModes.includes(args[0]))) {
  console.error('Error: Passwords must never be provided as command-line arguments. Use interactive prompt or --from-env.');
  process.exit(1);
}

const useEnv = args[0] === '--from-env';

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

function askHidden(query) {
  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      }
    });

    const isTTY = Boolean(process.stdin.isTTY);
    const rl = readline.createInterface({
      input: process.stdin,
      output: isTTY ? mutableStdout : process.stdout,
      terminal: isTTY
    });

    process.stdout.write(query);
    if (isTTY) {
      muted = true;
    }

    rl.question('', (answer) => {
      muted = false;
      if (isTTY) {
        process.stdout.write('\n');
      }
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runReset() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) {
    console.error('Error: ADMIN_EMAIL environment variable is missing or empty.');
    process.exit(1);
  }

  let newPassword = '';
  if (useEnv) {
    newPassword = process.env.ADMIN_PASSWORD || '';
    if (!newPassword) {
      console.error('Error: ADMIN_PASSWORD environment variable is empty.');
      process.exit(1);
    }
  } else {
    newPassword = await askHidden('Enter new admin password: ');
    const confirmPassword = await askHidden('Confirm new admin password: ');

    if (!newPassword || newPassword !== confirmPassword) {
      console.error('Error: Passwords do not match or are empty.');
      process.exit(1);
    }
  }

  // Validate password rules using shared auth validation
  const { checkPasswordRules, detectHiddenCharacters } = require('../src/validations/auth.validation');

  if (detectHiddenCharacters(newPassword)) {
    console.error('Error: Password contains hidden characters, spaces, or quotes.');
    process.exit(1);
  }

  const pwdValidation = checkPasswordRules(newPassword);
  if (!pwdValidation.valid) {
    console.error(`Error: ${pwdValidation.message}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const User = require('../src/models/User');
  const PasswordReset = require('../src/models/PasswordReset');

  const matchingUsers = await User.find({ email: adminEmail });

  if (matchingUsers.length > 1) {
    console.error('Error: Multiple accounts match ADMIN_EMAIL.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  const now = new Date();

  if (matchingUsers.length === 1) {
    const user = matchingUsers[0];
    if (user.role !== 'admin') {
      console.error(`Error: Account matching ADMIN_EMAIL is not an admin (role: ${user.role}).`);
      await mongoose.disconnect();
      process.exit(1);
    }

    user.passwordHash = passwordHash;
    user.isActive = true;
    user.emailVerified = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = now;
    await user.save();

    // Clean up any pending password reset tokens
    await PasswordReset.deleteMany({ userId: user._id });
  } else {
    // Admin does not exist: create it
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: now,
      emailVerifiedVia: 'reset',
      tokenVersion: 1,
      passwordChangedAt: now
    });
  }

  await mongoose.disconnect();
  console.log(`Admin password updated for ${maskEmail(adminEmail)}`);
}

runReset().catch((err) => {
  console.error(`Error resetting admin password: ${err.message}`);
  process.exit(1);
});
