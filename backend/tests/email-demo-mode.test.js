const request = require('supertest');

jest.mock('../src/config/database', () => ({
  isMongoConnected: jest.fn(() => true),
  connectMongoWithRetry: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  isRedisConnected: jest.fn(() => false),
  connectRedisWithRetry: jest.fn(),
  getRedisClient: jest.fn()
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  find: jest.fn()
}));

jest.mock('../src/models/LearnerProfile', () => ({
  create: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../src/models/EmailVerification', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../src/models/Booking', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0)
}));

jest.mock('../src/models/Conversation', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

const app = require('../src/app');
const User = require('../src/models/User');
const EmailVerification = require('../src/models/EmailVerification');
const { env, validateEnv } = require('../src/config/env');
const logger = require('../src/config/logger');
const { generateToken } = require('../src/utils/token');
const { validateRegistrationEmail } = require('../src/utils/emailValidation');
const emailService = require('../src/services/email');

function makeAuthCookie(userId, role = 'learner') {
  const token = generateToken({ id: userId, role, tv: 0 });
  return `token=${token}`;
}

describe('Email Demo Mode vs Live Mode', () => {
  const origEmailMode = env.EMAIL_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    env.EMAIL_MODE = 'demo';
  });

  afterAll(() => {
    env.EMAIL_MODE = origEmailMode;
  });

  describe('Demo Mode Registration & Verification Bypass', () => {
    it('creates an auto-verified user without token or verification email', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockImplementation((data) =>
        Promise.resolve({
          _id: 'demo-user-1',
          name: data.name,
          email: data.email,
          role: data.role,
          emailVerified: data.emailVerified,
          emailVerifiedAt: data.emailVerifiedAt,
          emailVerifiedVia: data.emailVerifiedVia,
          tokenVersion: 0
        })
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Demo Learner',
          email: 'demo@example.com',
          password: 'Password@123',
          role: 'learner'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.emailVerified).toBe(true);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
          emailVerifiedVia: 'demo',
          emailVerifiedAt: expect.any(Date)
        })
      );
      expect(EmailVerification.create).not.toHaveBeenCalled();
    });

    it('allows users to book and chat immediately with no EMAIL_NOT_VERIFIED error', async () => {
      const mockUser = {
        _id: 'demo-user-1',
        email: 'demo@example.com',
        role: 'learner',
        isActive: true,
        tokenVersion: 0,
        emailVerified: false // Even if an old account had false
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
        then: (resolve) => Promise.resolve(mockUser).then(resolve)
      });
      const MentorProfile = require('../src/models/MentorProfile');
      MentorProfile.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const cookie = makeAuthCookie('demo-user-1', 'learner');

      // Booking endpoint does not return 403 EMAIL_NOT_VERIFIED
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', cookie)
        .send({ mentorId: '65f1a2b3c4d5e6f7a8b9c0d1', startTime: new Date().toISOString() });

      expect(bookRes.status).not.toBe(403);
      expect(bookRes.body?.error?.code).not.toBe('EMAIL_NOT_VERIFIED');

      // Chat endpoint does not return 403 EMAIL_NOT_VERIFIED
      const chatRes = await request(app)
        .post('/api/chats')
        .set('Cookie', cookie)
        .send({ mentorId: '65f1a2b3c4d5e6f7a8b9c0d1' });

      expect(chatRes.status).not.toBe(403);
      expect(chatRes.body?.error?.code).not.toBe('EMAIL_NOT_VERIFIED');
    });

    it('skips MX and throwaway domain checks in demo mode', async () => {
      // In demo mode, disposable domain does not throw even in production mode
      await expect(
        validateRegistrationEmail('test@mailinator.com', true)
      ).resolves.toBeUndefined();
    });

    it('POST /api/auth/verify-email answers 200 with constant message and mutates nothing', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'random_token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email verification is turned off in demo mode.');
      expect(EmailVerification.findOne).not.toHaveBeenCalled();
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('POST /api/auth/resend-verification answers 200 with constant message and does nothing', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email verification is turned off in demo mode.');
      expect(EmailVerification.create).not.toHaveBeenCalled();
    });
  });

  describe('Demo Mode Email Transport & Safe Logging', () => {
    it('logs only emailType and recipientDomain at info level, without full address, token or link', async () => {
      const infoSpy = jest.spyOn(logger, 'info');

      await emailService.sendVerificationEmail(
        { email: 'secret_user@domain.com', name: 'Secret' },
        'sensitive_raw_token_xyz_12345'
      );

      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'verification',
          recipientDomain: 'domain.com'
        }),
        'demo email not sent'
      );

      // Verify no sensitive token or full address in logged object
      const loggedCall = infoSpy.mock.calls.find(call => call[1] === 'demo email not sent');
      expect(loggedCall).toBeDefined();
      const meta = loggedCall[0];
      expect(meta.recipientDomain).toBe('domain.com');
      expect(meta.emailType).toBe('verification');
      expect(meta).not.toHaveProperty('to');
      expect(JSON.stringify(meta)).not.toContain('secret_user@domain.com');
      expect(JSON.stringify(meta)).not.toContain('sensitive_raw_token_xyz_12345');

      infoSpy.mockRestore();
    });
  });

  describe('Startup Safety Guards & Env Defaults', () => {
    const baseValidEnv = {
      PORT: '5000',
      LOG_LEVEL: 'info',
      MONGO_URI: 'mongodb://localhost:27017/test',
      REDIS_URL: 'redis://localhost:6379',
      ML_SERVICE_URL: 'http://localhost:8000',
      JWT_SECRET: 'super_secure_random_production_secret_32_chars_minimum',
      COOKIE_SECURE: 'true',
      ADMIN_EMAIL: 'admin@mentormatch.local',
      ADMIN_PASSWORD: 'StrongPassword123!',
      PAYMENT_MODE: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_live_test',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
      PUBLIC_APP_URL: 'https://mentormatch.example.com'
    };

    it('defaults missing EMAIL_MODE to demo and emits a warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const parsed = validateEnv({
        ...baseValidEnv,
        NODE_ENV: 'development',
        PAYMENT_MODE: 'mock'
      });
      expect(parsed.EMAIL_MODE).toBe('demo');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('EMAIL_MODE'));
      warnSpy.mockRestore();
    });

    it('allows production startup in demo mode even if SMTP_HOST=mailpit', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => {
        validateEnv({
          ...baseValidEnv,
          NODE_ENV: 'production',
          EMAIL_MODE: 'demo',
          SMTP_HOST: 'mailpit'
        });
      }).not.toThrow();
      warnSpy.mockRestore();
    });

    it('refuses production startup in live mode if SMTP_HOST=mailpit', () => {
      expect(() => {
        validateEnv({
          ...baseValidEnv,
          NODE_ENV: 'production',
          EMAIL_MODE: 'live',
          SMTP_HOST: 'mailpit'
        });
      }).toThrow(/SMTP_HOST cannot be mailpit or localhost in live mode/);
    });
  });

  describe('GET /api/public-config', () => {
    it('returns only emailMode with 5 minute cache header', async () => {
      env.EMAIL_MODE = 'demo';
      const res = await request(app).get('/api/public-config');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=300');
      expect(res.body).toEqual({ emailMode: 'demo' });
      expect(Object.keys(res.body)).toEqual(['emailMode']);

      // Live mode test
      env.EMAIL_MODE = 'live';
      const resLive = await request(app).get('/api/public-config');
      expect(resLive.status).toBe(200);
      expect(resLive.body).toEqual({ emailMode: 'live' });
    });
  });
});
