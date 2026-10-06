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

const meetingLinkSchema = z.object({
  externalMeetingUrl: z.string().trim().max(300).refine((val) => {
    try {
      const parsed = new URL(val);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return host === 'meet.google.com' || host === 'zoom.us' || host.endsWith('.zoom.us');
    } catch {
      return false;
    }
  }, 'Meeting URL must be an https URL hosted on meet.google.com, zoom.us, or *.zoom.us.')
}).strict();

module.exports = {
  bookingIdSchema,
  createBookingSchema,
  bookingQuerySchema,
  cancelBookingSchema,
  meetingLinkSchema
};