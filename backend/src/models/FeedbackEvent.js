const mongoose = require('mongoose');

const feedbackEventSchema = new mongoose.Schema({
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['recommended', 'viewed', 'booked', 'rated'], required: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

feedbackEventSchema.index({ learnerId: 1, createdAt: -1 });

module.exports = mongoose.models.FeedbackEvent || mongoose.model('FeedbackEvent', feedbackEventSchema);