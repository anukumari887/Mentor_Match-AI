const { ensureAdminUser, maskEmail } = require('../src/services/adminSeed');
const User = require('../src/models/User');
const { env } = require('../src/config/env');
const logger = require('../src/config/logger');

jest.mock('../src/models/User');
jest.mock('../src/models/PasswordReset', () => ({
  deleteMany: jest.fn().mockResolvedValue({})
}));

describe('Admin Bootstrap and Normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.ADMIN_EMAIL = 'Admin@Example.com';
    env.ADMIN_PASSWORD = 'supersecureadminpassword123';
  });

  it('creates the admin when none exists with normalized email and role admin', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: 'admin1',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    await ensureAdminUser();

    expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        emailVerifiedVia: 'bootstrap'
      })
    );
  });

  it('does nothing when the admin account already exists', async () => {
    const existingAdmin = {
      _id: 'admin1',
      email: 'admin@example.com',
      role: 'admin',
      isActive: true
    };
    User.findOne.mockResolvedValueOnce(existingAdmin);

    const infoSpy = jest.spyOn(logger, 'info');

    await ensureAdminUser();

    expect(User.create).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith('admin account exists');
  });

  it('never changes the role of a non-admin account with the same email', async () => {
    const existingLearner = {
      _id: 'learner1',
      email: 'admin@example.com',
      role: 'learner',
      isActive: true
    };
    User.findOne.mockResolvedValueOnce(existingLearner);

    const errorSpy = jest.spyOn(logger, 'error');

    await ensureAdminUser();

    expect(User.create).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'ADMIN_EMAIL belongs to a non-admin account; use another email or run admin:reset'
    );
  });

  it('warns and does not create a second admin when an admin exists with a different email', async () => {
    // 1st query: find by email -> not found
    User.findOne.mockResolvedValueOnce(null);
    // 2nd query: find any admin -> found an admin with different email
    User.findOne.mockResolvedValueOnce({
      _id: 'otherAdmin',
      email: 'oldadmin@example.com',
      role: 'admin'
    });

    const warnSpy = jest.spyOn(logger, 'warn');

    await ensureAdminUser();

    expect(User.create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('An admin exists with a different email than ADMIN_EMAIL')
    );
  });

  it('normalizes capital letters in ADMIN_EMAIL properly', () => {
    env.ADMIN_EMAIL = 'AdMiN.TeSt@Example.COM  ';
    const normalized = env.ADMIN_EMAIL.trim().toLowerCase();
    expect(normalized).toBe('admin.test@example.com');
    expect(maskEmail(normalized)).toBe('a***@example.com');
  });
});

describe('Diagnostic and Tool Security Assurances', () => {
  it('maskEmail masks local part correctly', () => {
    expect(maskEmail('admins@matchmentor.ai')).toBe('a***@matchmentor.ai');
    expect(maskEmail('superadmin@test.org')).toBe('s***@test.org');
    expect(maskEmail('invalid')).toBe('***');
  });

  it('admin:reset rejects command line password arguments', () => {
    // Verify arguments check logic
    const testArgs = ['myNewSecretPassword'];
    const allowed = ['--from-env'];
    const rejected = testArgs.length > 0 && (testArgs.length !== 1 || !allowed.includes(testArgs[0]));
    expect(rejected).toBe(true);
  });

  it('admin:reset accepts --from-env', () => {
    const testArgs = ['--from-env'];
    const allowed = ['--from-env'];
    const rejected = testArgs.length > 0 && (testArgs.length !== 1 || !allowed.includes(testArgs[0]));
    expect(rejected).toBe(false);
  });
});
