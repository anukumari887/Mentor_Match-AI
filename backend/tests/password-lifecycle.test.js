const crypto = require('crypto');

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/models/PasswordReset', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../src/services/email', () => ({
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(),
  sendPasswordResetEmail: jest.fn().mockResolvedValue()
}));

jest.mock('../src/utils/token', () => ({
  COOKIE_NAME: 'token',
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn()
}));

const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const PasswordReset = require('../src/models/PasswordReset');
const emailService = require('../src/services/email');
const { verifyToken, generateToken, setAuthCookie, clearAuthCookie } = require('../src/utils/token');
const { requireAuth } = require('../src/middlewares/auth');
const authController = require('../src/controllers/auth.controller');
const {
  passwordValidator,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../src/validations/auth.validation');
const { calculateMentorCompleteness } = require('../src/utils/completeness');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('Password settings, lifecycle, and token version revocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password validation rules', () => {
    it('accepts valid passwords between 8 and 72 bytes', () => {
      expect(passwordValidator.safeParse('validPass123!').success).toBe(true);
      expect(passwordValidator.safeParse('longSecurePassword999').success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const res = passwordValidator.safeParse('short1');
      expect(res.success).toBe(false);
      expect(res.error.errors[0].message).toMatch(/at least 8 characters/);
    });

    it('rejects passwords exceeding 72 bytes', () => {
      const longPass = 'a'.repeat(73);
      const res = passwordValidator.safeParse(longPass);
      expect(res.success).toBe(false);
      expect(res.error.errors[0].message).toMatch(/72 bytes/);
    });

    it('rejects common passwords from blacklist', () => {
      expect(passwordValidator.safeParse('password').success).toBe(false);
      expect(passwordValidator.safeParse('12345678').success).toBe(false);
      expect(passwordValidator.safeParse('qwerty123').success).toBe(false);
    });
  });

  describe('Token version auth revocation', () => {
    it('allows a token without tv claim when user tokenVersion is 0', async () => {
      const req = { cookies: { token: 'valid-legacy' } };
      const res = createResponse();
      const next = jest.fn();

      verifyToken.mockReturnValue({ id: 'user-1' });
      User.findById.mockResolvedValue({ _id: 'user-1', isActive: true, tokenVersion: 0 });

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });

    it('allows a token with matching tv claim', async () => {
      const req = { cookies: { token: 'valid-updated' } };
      const res = createResponse();
      const next = jest.fn();

      verifyToken.mockReturnValue({ id: 'user-1', tv: 2 });
      User.findById.mockResolvedValue({ _id: 'user-1', isActive: true, tokenVersion: 2 });

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects a token with outdated tv claim after password change', async () => {
      const req = { cookies: { token: 'stale-token' } };
      const res = createResponse();
      const next = jest.fn();

      verifyToken.mockReturnValue({ id: 'user-1', tv: 1 });
      User.findById.mockResolvedValue({ _id: 'user-1', isActive: true, tokenVersion: 2 });

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' })
      );
    });
  });

  describe('Change password flow', () => {
    it('rejects invalid current password with 400 INVALID_CURRENT_PASSWORD', async () => {
      const req = {
        user: { _id: 'user-1' },
        body: { currentPassword: 'WrongPassword!', newPassword: 'BrandNewPassword123' }
      };
      const res = createResponse();
      const next = jest.fn();

      User.findById.mockResolvedValue({
        _id: 'user-1',
        passwordHash: 'hash-abc',
        tokenVersion: 1
      });
      bcrypt.compare.mockResolvedValueOnce(false); // current mismatch

      await authController.changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_CURRENT_PASSWORD' })
        })
      );
    });

    it('rejects same new password with 400 SAME_PASSWORD', async () => {
      const req = {
        user: { _id: 'user-1' },
        body: { currentPassword: 'ExistingPassword1', newPassword: 'ExistingPassword1' }
      };
      const res = createResponse();
      const next = jest.fn();

      User.findById.mockResolvedValue({
        _id: 'user-1',
        passwordHash: 'hash-abc',
        tokenVersion: 1
      });
      bcrypt.compare.mockResolvedValueOnce(true);  // current correct
      bcrypt.compare.mockResolvedValueOnce(true);  // same as new

      await authController.changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'SAME_PASSWORD' })
        })
      );
    });

    it('updates password, increments tokenVersion, issues new cookie, and sends email', async () => {
      const mockUser = {
        _id: 'user-1',
        name: 'Asha Rao',
        email: 'asha@example.com',
        role: 'mentor',
        passwordHash: 'old-hash',
        tokenVersion: 2,
        save: jest.fn().mockResolvedValue()
      };

      const req = {
        user: { _id: 'user-1' },
        body: { currentPassword: 'OldPassword123', newPassword: 'NewSecurePassword456' }
      };
      const res = createResponse();
      const next = jest.fn();

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);   // current correct
      bcrypt.compare.mockResolvedValueOnce(false);  // new is different
      bcrypt.hash.mockResolvedValueOnce('new-hash');
      generateToken.mockReturnValue('new-session-cookie');

      await authController.changePassword(req, res, next);

      expect(mockUser.passwordHash).toBe('new-hash');
      expect(mockUser.tokenVersion).toBe(3);
      expect(mockUser.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', tv: 3 })
      );
      expect(setAuthCookie).toHaveBeenCalledWith(res, 'new-session-cookie');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Logout all flow', () => {
    it('increments tokenVersion and clears auth cookie', async () => {
      const mockUser = {
        _id: 'user-1',
        tokenVersion: 1,
        save: jest.fn().mockResolvedValue()
      };
      const req = { user: { _id: 'user-1' } };
      const res = createResponse();
      const next = jest.fn();

      User.findById.mockResolvedValue(mockUser);

      await authController.logoutAll(req, res, next);

      expect(mockUser.tokenVersion).toBe(2);
      expect(mockUser.save).toHaveBeenCalled();
      expect(clearAuthCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Forgot and Reset password flow', () => {
    it('returns identical 200 response for existing and unknown email', async () => {
      const reqUnknown = { body: { email: 'unknown@example.com' } };
      const resUnknown = createResponse();
      const nextUnknown = jest.fn();

      User.findOne.mockResolvedValue(null);

      await authController.forgotPassword(reqUnknown, resUnknown, nextUnknown);

      expect(resUnknown.status).toHaveBeenCalledWith(200);
      expect(resUnknown.json).toHaveBeenCalledWith({
        message: 'If an account exists for that email, we have sent a reset link.'
      });
    });

    it('rejects invalid or expired token on reset-password', async () => {
      const req = { body: { token: 'bad-token', newPassword: 'NewValidPassword123' } };
      const res = createResponse();
      const next = jest.fn();

      PasswordReset.findOne.mockResolvedValue(null);

      await authController.resetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_OR_EXPIRED_TOKEN' })
        })
      );
    });

    it('rejects used reset token', async () => {
      const req = { body: { token: 'used-token', newPassword: 'NewValidPassword123' } };
      const res = createResponse();
      const next = jest.fn();

      PasswordReset.findOne.mockResolvedValue({
        userId: 'user-1',
        tokenHash: 'hash-xyz',
        expiresAt: new Date(Date.now() + 100000),
        usedAt: new Date()
      });

      await authController.resetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INVALID_OR_EXPIRED_TOKEN' })
        })
      );
    });
  });

  describe('Mentor completeness utility', () => {
    it('flags missing headline, bio, skills, rate, and availability', () => {
      const incomplete = { headline: '', bio: '', skills: [], pricePerHour: 50, availability: [] };
      const completeness = calculateMentorCompleteness(incomplete);

      expect(completeness.isComplete).toBe(false);
      expect(completeness.missing.map((m) => m.key)).toEqual([
        'headline',
        'bio',
        'skills',
        'pricePerHour',
        'availability'
      ]);
    });

    it('marks full profile as complete', () => {
      const complete = {
        headline: 'Staff Engineer',
        bio: '10 years experience building distributed systems',
        skills: ['Distributed Systems', 'Go'],
        pricePerHour: 1200,
        availability: [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }]
      };
      const completeness = calculateMentorCompleteness(complete);

      expect(completeness.isComplete).toBe(true);
      expect(completeness.missing).toHaveLength(0);
    });
  });
});
