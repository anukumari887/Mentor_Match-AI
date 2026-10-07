const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },
    usedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

emailVerificationSchema.index({ userId: 1, usedAt: 1 });

const EmailVerification =
  mongoose.models.EmailVerification ||
  mongoose.model('EmailVerification', emailVerificationSchema, 'emailVerifications');

module.exports = EmailVerification;
