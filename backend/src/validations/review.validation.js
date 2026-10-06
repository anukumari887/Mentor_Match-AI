const { z } = require('zod');

const reviewCreateSchema = z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking id.'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default('')
}).strict();

const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
}).strict();

module.exports = { reviewCreateSchema, reviewListQuerySchema };