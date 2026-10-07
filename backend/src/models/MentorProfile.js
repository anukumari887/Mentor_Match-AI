const mongoose = require('mongoose');

const availabilityWindowSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    }
  },
  { _id: false }
);

const mentorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    headline: {
      type: String,
      maxlength: 120,
      default: ''
    },
    bio: {
      type: String,
      maxlength: 1500,
      default: ''
    },
    skills: {
      type: [String],
      default: []
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 60,
      default: 0
    },
    pricePerHour: {
      type: Number,
      min: 100,
      max: 20000,
      default: 500
    },
    availability: {
      type: [availabilityWindowSchema],
      default: []
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    ratingAvg: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    adminNotifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const MentorProfile =
  mongoose.models.MentorProfile ||
  mongoose.model('MentorProfile', mentorProfileSchema);

module.exports = MentorProfile;
