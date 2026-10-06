const { z } = require('zod');

const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5)
}).strict();

module.exports = { recommendationQuerySchema };