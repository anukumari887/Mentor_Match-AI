jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/models/LearnerProfile', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({
  findOne: jest.fn(),
  create: jest.fn()
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
const LearnerProfile = require('../src/models/LearnerProfile');
const MentorProfile = require('../src/models/MentorProfile');
const { verifyToken, generateToken, setAuthCookie } = require('../src/utils/token');
const { requireAuth, requireRole } = require('../src/middlewares/auth');
const authController = require('../src/controllers/auth.controller');
const { registerSchema } = require('../src/validations/auth.validation');
const { availabilityArraySchema } = require('../src/validations/profile.validation');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('Authentication and profile contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes registration details and rejects admin or unknown roles', () => {
    const result = registerSchema.parse({
      name: ' Anu Kumar ',
      email: ' ANU@EXAMPLE.COM ',
      password: 'password123',
      role: 'learner'
    });

    expect(result).toMatchObject({ name: 'Anu Kumar', email: 'anu@example.com' });
    expect(registerSchema.safeParse({ ...result, role: 'admin' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...result, extra: true }).success).toBe(false);
  });

  it('rejects overlapping availability but permits adjacent windows', () => {
    const overlapping = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
    ];
    const adjacent = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
    ];

    expect(availabilityArraySchema.safeParse(overlapping).success).toBe(false);
    expect(availabilityArraySchema.safeParse(adjacent).success).toBe(true);
    expect(availabilityArraySchema.safeParse([
      { dayOfWeek: 8, startTime: '09:00', endTime: '10:00' }
    ]).success).toBe(false);
  });

  it('creates a learner account with a profile and httpOnly session cookie', async () => {
    const user = { _id: 'learner-id', name: 'Anu Kumar', email: 'anu@example.com', role: 'learner' };
    const profile = { userId: 'learner-id', wantedSkills: [] };
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('password-hash');
    User.create.mockResolvedValue(user);
    LearnerProfile.create.mockResolvedValue(profile);
    generateToken.mockReturnValue('signed-session');
    const req = { body: { name: ' Anu Kumar ', email: 'ANU@example.com', password: 'password123', role: 'learner' } };
    const res = createResponse();
    const next = jest.fn();

    await authController.register(req, res, next);

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Anu Kumar',
      email: 'anu@example.com',
      passwordHash: 'password-hash',
      role: 'learner'
    }));
    expect(LearnerProfile.create).toHaveBeenCalledWith({ userId: 'learner-id' });
    expect(setAuthCookie).toHaveBeenCalledWith(res, 'signed-session');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: expect.objectContaining({ id: 'learner-id' }), profile });
    expect(next).not.toHaveBeenCalled();
  });

  it('logs in an active learner and returns their profile', async () => {
    const user = {
      _id: 'learner-id',
      name: 'Anu Kumar',
      email: 'anu@example.com',
      role: 'learner',
      isActive: true,
      passwordHash: 'password-hash'
    };
    const profile = { userId: 'learner-id' };
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    LearnerProfile.findOne.mockResolvedValue(profile);
    generateToken.mockReturnValue('signed-session');
    const req = { body: { email: 'ANU@example.com', password: 'password123' } };
    const res = createResponse();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'anu@example.com' });
    expect(setAuthCookie).toHaveBeenCalledWith(res, 'signed-session');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: expect.objectContaining({ id: 'learner-id' }), profile });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the same login error for an unknown email and a wrong password', async () => {
    const req = { body: { email: 'unknown@example.com', password: 'password123' } };
    const res = createResponse();
    const next = jest.fn();
    User.findOne.mockResolvedValue(null);

    await authController.login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.'
    }));
  });

  it('loads the active database user before granting a protected role', async () => {
    const databaseUser = { _id: 'mentor-id', role: 'mentor', isActive: true };
    verifyToken.mockReturnValue({ id: 'mentor-id', role: 'admin' });
    User.findById.mockResolvedValue(databaseUser);
    const req = { cookies: { token: 'signed-session' }, headers: {} };
    const next = jest.fn();

    await requireAuth(req, {}, next);
    requireRole('mentor')(req, {}, next);

    expect(req.user).toBe(databaseUser);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects inactive users and users with the wrong database role', async () => {
    verifyToken.mockReturnValue({ id: 'learner-id', role: 'admin' });
    User.findById.mockResolvedValue({ _id: 'learner-id', role: 'learner', isActive: false });
    const next = jest.fn();

    await requireAuth({ cookies: { token: 'signed-session' }, headers: {} }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: 'ACCOUNT_DEACTIVATED' }));

    const roleNext = jest.fn();
    requireRole('admin')({ user: { role: 'learner' } }, {}, roleNext);
    expect(roleNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });
});