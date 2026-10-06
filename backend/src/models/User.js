const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['learner', 'mentor', 'admin'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    passwordChangedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
