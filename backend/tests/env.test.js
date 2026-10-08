const { validateEnv } = require('../src/config/env');

describe('Environment Validation', () => {
  const validDevEnv = {
    NODE_ENV: 'development',
    PORT: '5000',
    LOG_LEVEL: 'info',
    MONGO_URI: 'mongodb://localhost:27017/test',
    REDIS_URL: 'redis://localhost:6379',
    ML_SERVICE_URL: 'http://localhost:8000',
    ML_TIMEOUT_MS: '2000',
    JWT_SECRET: 'dev_only_change_me_to_a_long_random_string_32chars_min',
    JWT_EXPIRES_IN: '7d',
    COOKIE_SECURE: 'false',
    CORS_ORIGIN: 'http://localhost:3000',
    ADMIN_EMAIL: 'admin@mentormatch.local',
    ADMIN_PASSWORD: 'ChangeMe123!',
    PAYMENT_MODE: 'mock',
    PLATFORM_FEE_PERCENT: '15',
    SLOT_LOCK_MINUTES: '10',
    MIN_BOOKING_LEAD_HOURS: '2',
    FREE_CANCEL_HOURS: '24'
  };

  it('validates a correct development configuration', () => {
    const validated = validateEnv(validDevEnv);
    expect(validated.PORT).toBe(5000);
    expect(validated.PAYMENT_MODE).toBe('mock');
  });

  it('fails if JWT_SECRET is less than 32 characters', () => {
    expect(() => {
      validateEnv({
        ...validDevEnv,
        JWT_SECRET: 'too_short'
      });
    }).toThrow(/JWT_SECRET must be at least 32 characters/);
  });

  it('fails in production if JWT_SECRET contains dev_only', () => {
    expect(() => {
      validateEnv({
        ...validDevEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        ADMIN_PASSWORD: 'StrongPassword123!',
        PAYMENT_MODE: 'razorpay',
        RAZORPAY_KEY_ID: 'key_id',
        RAZORPAY_KEY_SECRET: 'key_secret',
        RAZORPAY_WEBHOOK_SECRET: 'wh_secret'
      });
    }).toThrow(/JWT_SECRET must not contain "dev_only"/);
  });

  it('fails in production if ADMIN_PASSWORD is default', () => {
    expect(() => {
      validateEnv({
        ...validDevEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'production_super_secure_secret_that_is_long_enough',
        COOKIE_SECURE: 'true',
        ADMIN_PASSWORD: 'ChangeMe123!',
        PAYMENT_MODE: 'razorpay',
        RAZORPAY_KEY_ID: 'key_id',
        RAZORPAY_KEY_SECRET: 'key_secret',
        RAZORPAY_WEBHOOK_SECRET: 'wh_secret'
      });
    }).toThrow(/ADMIN_PASSWORD must not be the default value/);
  });

  it('fails in production if PAYMENT_MODE is mock', () => {
    expect(() => {
      validateEnv({
        ...validDevEnv,
        NODE_ENV: 'production',
        JWT_SECRET: 'production_super_secure_secret_that_is_long_enough',
        COOKIE_SECURE: 'true',
        ADMIN_PASSWORD: 'StrongPassword123!',
        PAYMENT_MODE: 'mock'
      });
    }).toThrow(/PAYMENT_MODE=mock is refused in production/);
  });

  it('fails if PAYMENT_MODE is razorpay but keys are missing', () => {
    expect(() => {
      validateEnv({
        ...validDevEnv,
        PAYMENT_MODE: 'razorpay',
        RAZORPAY_KEY_ID: ''
      });
    }).toThrow(/requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET/);
  });

  it('fails in production if ADMIN_PASSWORD contains Windows carriage return, spaces or quotes', () => {
    const validProd = {
      ...validDevEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'production_super_secure_secret_that_is_long_enough',
      COOKIE_SECURE: 'true',
      PAYMENT_MODE: 'razorpay',
      RAZORPAY_KEY_ID: 'key_id',
      RAZORPAY_KEY_SECRET: 'key_secret',
      RAZORPAY_WEBHOOK_SECRET: 'wh_secret'
    };

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_PASSWORD: 'StrongPassword123!\r'
      });
    }).toThrow(/ADMIN_EMAIL or ADMIN_PASSWORD has hidden characters \(spaces, quotes or Windows line endings\)\. Fix \.env\.production\./);

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_PASSWORD: ' StrongPassword123!'
      });
    }).toThrow(/ADMIN_EMAIL or ADMIN_PASSWORD has hidden characters \(spaces, quotes or Windows line endings\)\. Fix \.env\.production\./);

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_PASSWORD: '"StrongPassword123!"'
      });
    }).toThrow(/ADMIN_EMAIL or ADMIN_PASSWORD has hidden characters \(spaces, quotes or Windows line endings\)\. Fix \.env\.production\./);
  });

  it('fails in production if ADMIN_EMAIL contains carriage return, quotes or leading/trailing spaces', () => {
    const validProd = {
      ...validDevEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'production_super_secure_secret_that_is_long_enough',
      COOKIE_SECURE: 'true',
      ADMIN_PASSWORD: 'StrongPassword123!',
      PAYMENT_MODE: 'razorpay',
      RAZORPAY_KEY_ID: 'key_id',
      RAZORPAY_KEY_SECRET: 'key_secret',
      RAZORPAY_WEBHOOK_SECRET: 'wh_secret'
    };

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_EMAIL: 'admin@mentormatch.local\r'
      });
    }).toThrow(/ADMIN_EMAIL or ADMIN_PASSWORD has hidden characters \(spaces, quotes or Windows line endings\)\. Fix \.env\.production\./);

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_EMAIL: ' admin@mentormatch.local'
      });
    }).toThrow(/ADMIN_EMAIL or ADMIN_PASSWORD has hidden characters \(spaces, quotes or Windows line endings\)\. Fix \.env\.production\./);
  });

  it('fails in production if ADMIN_PASSWORD is in the common passwords list', () => {
    const validProd = {
      ...validDevEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'production_super_secure_secret_that_is_long_enough',
      COOKIE_SECURE: 'true',
      PAYMENT_MODE: 'razorpay',
      RAZORPAY_KEY_ID: 'key_id',
      RAZORPAY_KEY_SECRET: 'key_secret',
      RAZORPAY_WEBHOOK_SECRET: 'wh_secret'
    };

    expect(() => {
      validateEnv({
        ...validProd,
        ADMIN_PASSWORD: 'password'
      });
    }).toThrow(/Production safety check failed: ADMIN_PASSWORD invalid/);
  });

  it('normalizes ADMIN_EMAIL with trim and lowercase in validated output', () => {
    const result = validateEnv({
      ...validDevEnv,
      ADMIN_EMAIL: '  Admin.Test@MentorMatch.Local  '
    });
    expect(result.ADMIN_EMAIL).toBe('admin.test@mentormatch.local');
  });
});

