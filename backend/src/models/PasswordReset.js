const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema(
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

passwordResetSchema.index({ userId: 1, usedAt: 1 });

const PasswordReset =
  mongoose.models.PasswordReset ||
  mongoose.model('PasswordReset', passwordResetSchema);

module.exports = PasswordReset;
