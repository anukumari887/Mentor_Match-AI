const crypto = require('crypto');
const dns = require('dns');

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
  create: jest.fn()
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

jest.mock('../src/services/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminMentorReviewEmail: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const EmailVerification = require('../src/models/EmailVerification');
const { sendVerificationEmail } = require('../src/services/email');
const { migrateExistingUsersEmailVerified } = require('../src/services/userMigration');
const { validateEmailDomain } = require('../src/utils/emailValidation');
const { generateToken } = require('../src/utils/token');

function makeAuthCookie(userId, role = 'learner') {
  const token = generateToken({ id: userId, role, tv: 0 });
  return `token=${token}`;
}

const { env } = require('../src/config/env');

describe('Email Verification & Domain Validation Rules', () => {
  const origEmailMode = env.EMAIL_MODE;

  beforeAll(() => {
    env.EMAIL_MODE = 'live';
  });

  afterAll(() => {
    env.EMAIL_MODE = origEmailMode;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration & Token Issuance', () => {
    it('creates an unverified user and sends verification email with token link', async () => {
      User.findOne.mockResolvedValue(null);

      User.create.mockResolvedValue({
        _id: 'new-user-123',
        name: 'Fresh Learner',
        email: 'fresh@example.com',
        role: 'learner',
        emailVerified: false,
        tokenVersion: 0
      });

      EmailVerification.deleteMany.mockResolvedValue({ deletedCount: 0 });
      EmailVerification.create.mockResolvedValue({
        userId: 'new-user-123',
        tokenHash: 'sample-hash'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fresh Learner',
          email: 'fresh@example.com',
          password: 'Password@123',
          role: 'learner'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.emailVerified).toBe(false);

      // Issued token is hashed, email sent
      expect(EmailVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-123',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date)
        })
      );
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'fresh@example.com' }),
        expect.any(String)
      );
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('verifies user once with correct token and marks token used', async () => {
      const rawToken = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const mockVerification = {
        _id: 'verif-id-1',
        userId: 'user-id-123',
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        usedAt: null,
        save: jest.fn().mockResolvedValue(true)
      };

      EmailVerification.findOne.mockResolvedValue(mockVerification);
      User.findById.mockResolvedValue({
        _id: 'user-id-123',
        emailVerified: false,
        save: jest.fn().mockResolvedValue(true)
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Email verified successfully');
      expect(mockVerification.save).toHaveBeenCalled();
    });

    it('returns INVALID_OR_EXPIRED_TOKEN with identical message for wrong, expired or used tokens', async () => {
      EmailVerification.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'wrongtoken12345678901234567890123456789012' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
      expect(res.body.error.message).toBe('This verification link is invalid or has expired. Please request a new one.');
    });
  });

  describe('Resend Verification', () => {
    it('returns standard confirmation for logged in user', async () => {
      User.findById.mockImplementation((id) => Promise.resolve({
        _id: id,
        email: 'unverified@test.com',
        name: 'Learner',
        role: 'learner',
        isActive: true,
        tokenVersion: 0,
        emailVerified: false
      }));

      EmailVerification.findOne.mockReturnValue({
        sort: () => Promise.resolve(null)
      });
      EmailVerification.deleteMany.mockResolvedValue({ deletedCount: 1 });
      EmailVerification.create.mockResolvedValue({});

      const cookie = makeAuthCookie('user-id-123', 'learner');
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Verification link sent');
    });
  });

  describe('Startup Migration', () => {
    it('sets emailVerified: true for old users lacking the field and runs safely twice', async () => {
      User.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const count1 = await migrateExistingUsersEmailVerified();
      expect(count1).toBe(5);
      expect(User.updateMany).toHaveBeenCalledWith(
        { emailVerified: { $exists: false } },
        { $set: { emailVerified: true, emailVerifiedAt: expect.any(Date) } }
      );

      // Running second time: 0 modified
      User.updateMany.mockResolvedValue({ modifiedCount: 0 });
      const count2 = await migrateExistingUsersEmailVerified();
      expect(count2).toBe(0);
    });
  });

  describe('EMAIL_VERIFICATION_REQUIRED Route Guardrails', () => {
    it('returns 403 EMAIL_NOT_VERIFIED for unverified users on restricted endpoints', async () => {
      User.findById.mockImplementation((id) => Promise.resolve({
        _id: id,
        email: 'unverified@test.com',
        role: 'learner',
        isActive: true,
        tokenVersion: 0,
        emailVerified: false
      }));

      const cookie = makeAuthCookie('unverified-user', 'learner');

      // 1. Create booking is blocked
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Cookie', cookie)
        .send({ mentorId: '65f1a2b3c4d5e6f7a8b9c0d1', startTime: new Date().toISOString() });
      expect(bookRes.status).toBe(403);
      expect(bookRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      // 2. Create payment order is blocked
      const payRes = await request(app)
        .post('/api/payments/create-order')
        .set('Cookie', cookie)
        .send({ bookingId: '65f1a2b3c4d5e6f7a8b9c0d1' });
      expect(payRes.status).toBe(403);
      expect(payRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      // 3. Create conversation is blocked
      const convRes = await request(app)
        .post('/api/chats')
        .set('Cookie', cookie)
        .send({ mentorId: '65f1a2b3c4d5e6f7a8b9c0d1' });
      expect(convRes.status).toBe(403);
      expect(convRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('allows verified users to pass without 403 EMAIL_NOT_VERIFIED', async () => {
      User.findById.mockImplementation((id) => Promise.resolve({
        _id: id,
        email: 'verified@test.com',
        role: 'mentor',
        isActive: true,
        tokenVersion: 0,
        emailVerified: true
      }));

      const cookie = makeAuthCookie('verified-user', 'mentor');
      // Request review for verified mentor
      const reviewRes = await request(app)
        .post('/api/mentors/request-review')
        .set('Cookie', cookie);

      // Should not be 403 EMAIL_NOT_VERIFIED
      expect(reviewRes.body?.error?.code).not.toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('Domain and Disposable Checks in Production Mode', () => {
    const origEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = origEnv;
      jest.restoreAllMocks();
    });

    it('rejects blocklisted disposable domains in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const check = await validateEmailDomain('fake@mailinator.com');
      expect(check.valid).toBe(false);
      expect(check.reason).toBe('DISPOSABLE_DOMAIN');
    });

    it('rejects domains with no MX servers in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const resolveSpy = jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue({ code: 'ENOTFOUND' });

      const check = await validateEmailDomain('user@nonexistentdomain12345.org');
      expect(check.valid).toBe(false);
      expect(check.reason).toBe('NO_MX_RECORDS');
      resolveSpy.mockRestore();
    });

    it('allows email when DNS times out or errors (never blocks real users due to DNS slowness)', async () => {
      process.env.NODE_ENV = 'production';
      const resolveSpy = jest.spyOn(dns.promises, 'resolveMx').mockRejectedValue({ code: 'ETIMEOUT' });

      const check = await validateEmailDomain('user@realcorp.com');
      expect(check.valid).toBe(true);
      resolveSpy.mockRestore();
    });

    it('skips all domain checks outside production', async () => {
      process.env.NODE_ENV = 'development';
      const check = await validateEmailDomain('fake@mailinator.com');
      expect(check.valid).toBe(true);
    });
  });
});
