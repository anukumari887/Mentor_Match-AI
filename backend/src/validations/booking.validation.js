const { z } = require('zod');

const bookingIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking id.')
}).strict();

const createBookingSchema = z.object({
  mentorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid mentor id.'),
  startTime: z.string().datetime({ offset: true })
}).strict();

const bookingQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'expired']).optional()
}).strict();

const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional()
}).strict();

module.exports = {
  bookingIdSchema,
  createBookingSchema,
  bookingQuerySchema,
  cancelBookingSchema
};