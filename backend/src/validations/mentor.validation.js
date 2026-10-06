const { z } = require('zod');

const mentorQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  skill: z.string().trim().max(50).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  day: z.coerce.number().int().min(0).max(6).optional(),
  sort: z.enum(['rating', 'price_asc', 'price_desc', 'experience']).default('rating'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).strict().refine(
  (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
  { message: 'Minimum price must not exceed maximum price.', path: ['minPrice'] }
);

const mentorIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid mentor id.')
}).strict();

const adminMentorQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();

const rejectMentorSchema = z.object({
  reason: z.string().trim().min(1, 'A rejection reason is required.').max(500)
}).strict();

module.exports = {
  mentorQuerySchema,
  mentorIdSchema,
  adminMentorQuerySchema,
  rejectMentorSchema
};