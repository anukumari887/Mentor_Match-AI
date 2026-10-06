const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, minlength: 1, maxlength: 2000 },
  clientMessageId: { type: String, required: true }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true }
);

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
