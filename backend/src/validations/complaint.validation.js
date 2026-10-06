const { z } = require('zod');

const objectIdRegex = /^[a-f\d]{24}$/i;

const createComplaintSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid booking ID').optional().nullable(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200, 'Subject cannot exceed 200 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters')
}).strict();

const resolveComplaintSchema = z.object({
  resolutionNote: z.string().trim().min(1, 'Resolution note is required').max(2000, 'Resolution note cannot exceed 2000 characters')
}).strict();

module.exports = {
  createComplaintSchema,
  resolveComplaintSchema
};
