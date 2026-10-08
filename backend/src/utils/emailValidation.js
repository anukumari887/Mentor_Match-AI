const dns = require('dns');
const { isDisposableEmailDomain } = require('./disposableEmailDomains');
const { AppError } = require('./errors');
const logger = require('../config/logger');

async function validateEmailDomain(email) {
  if (process.env.NODE_ENV !== 'production') {
    return { valid: true };
  }

  const parts = (email || '').split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const domain = parts[1].toLowerCase().trim();

  // (b) Reject domains from disposable blocklist
  if (isDisposableEmailDomain(domain)) {
    return { valid: false, reason: 'DISPOSABLE_DOMAIN' };
  }

  // (a) Reject the address if its domain has no mail server, using dns.promises.resolveMx with 3-second timeout
  // Reject ONLY on ENOTFOUND or ENODATA, and ALLOW on timeout or any other DNS error
  let timerId;
  try {
    const addresses = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          const timeoutErr = new Error('DNS MX check timeout');
          timeoutErr.code = 'ETIMEDOUT';
          reject(timeoutErr);
        }, 3000);
      })
    ]);
    if (timerId) clearTimeout(timerId);

    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: 'NO_MX_RECORDS' };
    }
    return { valid: true };
  } catch (err) {
    if (timerId) clearTimeout(timerId);
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return { valid: false, reason: 'NO_MX_RECORDS' };
    }
    // Allow address on timeouts or any other DNS error (never block real user because DNS was slow)
    logger.warn({ domain, error: err.message, code: err.code }, 'DNS MX check skipped or timed out; allowing registration');
    return { valid: true };
  }
}

async function validateRegistrationEmail(email, isProduction = false) {
  const { env } = require('../config/env');
  if (env.EMAIL_MODE === 'demo') {
    return;
  }
  if (!isProduction) return;
  const result = await validateEmailDomain(email);
  if (!result.valid) {
    throw new AppError('This email address looks wrong. Please check it, or use a different one.', 400, 'EMAIL_DOMAIN_INVALID');
  }
}

module.exports = {
  validateEmailDomain,
  validateRegistrationEmail
};
