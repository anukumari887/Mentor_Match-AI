const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  platformFee: { type: Number, required: true, min: 0 },
  mentorEarning: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  gateway: { type: String, enum: ['mock', 'razorpay'], required: true },
  gatewayOrderId: { type: String, required: true, unique: true },
  gatewayPaymentId: { type: String, default: '' },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refund_due', 'refunded'], default: 'created' },
  lateArrival: { type: Boolean, default: false },
  earned: { type: Boolean, default: false },
  paidAt: Date,
  refundedAt: Date,
  refundReference: { type: String, default: '' }
}, { timestamps: true });

paymentSchema.index({ learnerId: 1, createdAt: -1 });
paymentSchema.index({ mentorId: 1, earned: 1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);