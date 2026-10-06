const { z } = require('zod');

const idRegex = /^[a-f\d]{24}$/i;

const chatIdParamSchema = z.object({
  id: z.string().regex(idRegex, 'Invalid conversation id.')
}).strict();

const chatAccessQuerySchema = z.object({
  mentorId: z.string().regex(idRegex, 'Invalid mentor id.')
}).strict();

const createChatSchema = z.object({
  mentorId: z.string().regex(idRegex, 'Invalid mentor id.')
}).strict();

const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message cannot exceed 2000 characters.'),
  clientMessageId: z.string().trim().min(1, 'clientMessageId is required.').max(100)
}).strict();

const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30)
}).strict();

module.exports = {
  chatIdParamSchema,
  chatAccessQuerySchema,
  createChatSchema,
  sendMessageSchema,
  messagesQuerySchema
};
