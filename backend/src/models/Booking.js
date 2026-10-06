const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  priceAtBooking: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'expired'],
    required: true,
    default: 'pending'
  },
  holdsSlot: { type: Boolean, required: true, default: true },
  expiresAt: Date,
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  reminderSent: { type: Boolean, default: false },
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: { type: String, enum: ['learner', 'mentor'] },
  cancelReason: { type: String, maxlength: 500 },
  hasReview: { type: Boolean, default: false }
}, { timestamps: true });

bookingSchema.index(
  { mentorId: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true } }
);
bookingSchema.index({ learnerId: 1, startTime: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ status: 1, endTime: 1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);