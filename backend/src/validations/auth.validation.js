const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['learner', 'mentor'], {
    errorMap: () => ({ message: 'Role must be either learner or mentor' })
  })
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
}).strict();

module.exports = {
  registerSchema,
  loginSchema
};
