const { z } = require('zod');

const COMMON_PASSWORDS = new Set([
  'password',
  '12345678',
  '123456789',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'letmein1'
]);

const passwordValidator = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
    message: 'Password must not exceed 72 bytes'
  })
  .refine((val) => !COMMON_PASSWORDS.has(val.toLowerCase()), {
    message: 'This password is too common. Please choose a more secure password.'
  });

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: passwordValidator,
  role: z.enum(['learner', 'mentor'], {
    errorMap: () => ({ message: 'Role must be either learner or mentor' })
  })
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordValidator
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address')
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: passwordValidator
}).strict();

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required')
}).strict();

module.exports = {
  passwordValidator,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  COMMON_PASSWORDS
};
