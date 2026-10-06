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
      match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:mm format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    }
  },
  { _id: false }
);

const learnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    goals: {
      type: String,
      maxlength: 500,
      default: ''
    },
    knownSkills: {
      type: [String],
      default: []
    },
    wantedSkills: {
      type: [String],
      default: []
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    budgetPerHour: {
      type: Number,
      default: 0
    },
    availability: {
      type: [availabilityWindowSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const LearnerProfile =
  mongoose.models.LearnerProfile ||
  mongoose.model('LearnerProfile', learnerProfileSchema);

module.exports = LearnerProfile;
