const { z } = require('zod');

// Schema for raw process.env
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGO_URI: z.string().default('mongodb://mongo:27017/mentormatch'),
  REDIS_URL: z.string().default('redis://redis:6379'),
  ML_SERVICE_URL: z.string().default('http://ml-service:8000'),
  ML_TIMEOUT_MS: z.coerce.number().default(2000),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters long'),

  PAYMENT_MODE: z.enum(['mock', 'razorpay']).default('mock'),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(15),
  SLOT_LOCK_MINUTES: z.coerce.number().min(1).default(10),
  MIN_BOOKING_LEAD_HOURS: z.coerce.number().min(0).default(2),
  FREE_CANCEL_HOURS: z.coerce.number().min(0).default(24),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  SMTP_HOST: z.string().default('mailpit'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Mentor-Match <no-reply@mentormatch.local>'),

  STUN_URLS: z.string().default('stun:stun.l.google.com:19302'),
  TURN_URL: z.string().optional().default(''),
  TURN_USERNAME: z.string().optional().default(''),
  TURN_CREDENTIAL: z.string().optional().default(''),

  METRICS_TOKEN: z.string().optional().default(''),
  CHAT_VALIDITY_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  CHAT_EMAIL_THROTTLE_MINUTES: z.coerce.number().int().min(1).max(120).default(10),
  EMAIL_VERIFICATION_REQUIRED: z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'false' || val === '0') return false;
      if (val.toLowerCase() === 'true' || val === '1') return true;
    }
    return val;
  }, z.boolean()).default(true),
  VITE_API_URL: z.string().optional().default('http://localhost:5000'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:3000')
});

function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors.map(
      (err) => ` - ${err.path.join('.')}: ${err.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }

  const env = result.data;

  // Startup safety rules:
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.includes('dev_only')) {
      throw new Error('Production safety check failed: JWT_SECRET must not contain "dev_only"');
    }
    if (env.ADMIN_PASSWORD === 'ChangeMe123!') {
      throw new Error('Production safety check failed: ADMIN_PASSWORD must not be the default value');
    }
    if (env.PAYMENT_MODE === 'mock') {
      throw new Error('Production safety check failed: PAYMENT_MODE=mock is refused in production');
    }
    if (!env.COOKIE_SECURE) {
      throw new Error('Production safety check failed: COOKIE_SECURE must be true in production');
    }
    if (!env.PUBLIC_APP_URL || env.PUBLIC_APP_URL.includes('localhost') || !env.PUBLIC_APP_URL.startsWith('https://')) {
      throw new Error('Production safety check failed: PUBLIC_APP_URL must be a valid https URL and cannot be localhost in production');
    }
  }

  if (env.PAYMENT_MODE === 'razorpay') {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error(
        'PAYMENT_MODE=razorpay requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET to all be non-empty'
      );
    }
  }

  return env;
}

let cachedEnv;
try {
  cachedEnv = validateEnv(process.env);
} catch (err) {
  // During tests, caller might want to control or mock env
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  validateEnv,
  env: cachedEnv || process.env
};
