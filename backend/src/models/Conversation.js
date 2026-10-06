const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessageAt: { type: Date, default: null },
  lastMessagePreview: { type: String, maxlength: 80, default: '' },
  learnerLastReadAt: { type: Date, default: Date.now },
  mentorLastReadAt: { type: Date, default: Date.now },
  learnerEmailNotifiedAt: { type: Date, default: null },
  mentorEmailNotifiedAt: { type: Date, default: null }
}, { timestamps: true });

conversationSchema.index({ learnerId: 1, mentorId: 1 }, { unique: true });
conversationSchema.index({ learnerId: 1, lastMessageAt: -1 });
conversationSchema.index({ mentorId: 1, lastMessageAt: -1 });

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
