const { z } = require('zod');

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ID format');

const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['learner', 'mentor', 'admin']).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean()
}).strict();

const adminBookingsQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'expired']).optional(),
  mentorId: z.string().regex(objectIdRegex).optional(),
  learnerId: z.string().regex(objectIdRegex).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const adminPaymentsQuerySchema = z.object({
  status: z.enum(['created', 'paid', 'failed', 'refund_due', 'refunded']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const markRefundedSchema = z.object({
  refundReference: z.string().trim().min(1, 'Refund reference is required').max(200)
}).strict();

const recordPayoutSchema = z.object({
  mentorId: z.string().regex(objectIdRegex, 'Invalid mentor ID'),
  amount: z.coerce.number().int().positive('Amount must be a positive integer in paise'),
  reference: z.string().trim().min(1, 'Reference is required').max(200)
}).strict();

const adminComplaintsQuerySchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = {
  objectIdSchema,
  adminUsersQuerySchema,
  updateUserStatusSchema,
  adminBookingsQuerySchema,
  adminPaymentsQuerySchema,
  markRefundedSchema,
  recordPayoutSchema,
  adminComplaintsQuerySchema
};
