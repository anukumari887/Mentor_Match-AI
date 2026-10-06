const MentorProfile = require('../models/MentorProfile');
const User = require('../models/User');
const {
  adminMentorQuerySchema,
  mentorIdSchema,
  rejectMentorSchema
} = require('../validations/mentor.validation');
const { AppError } = require('../utils/errors');

function presentMentor(profile) {
  const { _id, userId, ...details } = profile;
  return {
    id: String(userId._id || userId),
    name: userId.name || 'Mentor',
    email: userId.email,
    ...details
  };
}

async function listMentors(req, res, next) {
  try {
    const query = adminMentorQuerySchema.parse(req.query);
    const users = await User.find({ role: 'mentor' }).select('_id name email isActive').lean();
    const byId = new Map(users.map((user) => [String(user._id), user]));
    const userIds = users.map((user) => user._id);
    const filter = { approvalStatus: query.status, userId: { $in: userIds } };
    const skip = (query.page - 1) * query.limit;
    const [profiles, total] = await Promise.all([
      MentorProfile.find(filter).sort({ createdAt: 1 }).skip(skip).limit(query.limit).lean(),
      MentorProfile.countDocuments(filter)
    ]);
    const items = profiles
      .filter((profile) => byId.has(String(profile.userId)))
      .map((profile) => presentMentor({ ...profile, userId: byId.get(String(profile.userId)) }));

    return res.status(200).json({ items, total, page: query.page, limit: query.limit });
  } catch (error) {
    return next(error);
  }
}

async function approveMentor(req, res, next) {
  try {
    const { id } = mentorIdSchema.parse(req.params);
    const activeMentor = await User.exists({ _id: id, role: 'mentor', isActive: true });
    if (!activeMentor) return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));

    const profile = await MentorProfile.findOneAndUpdate(
      { userId: id },
      { $set: { approvalStatus: 'approved', rejectionReason: '' } },
      { new: true, runValidators: true }
    ).populate('userId', 'name email').lean();
    if (!profile) return next(new AppError('Mentor profile not found.', 404, 'NOT_FOUND'));
    return res.status(200).json({ mentor: presentMentor(profile) });
  } catch (error) {
    return next(error);
  }
}

async function rejectMentor(req, res, next) {
  try {
    const { id } = mentorIdSchema.parse(req.params);
    const { reason } = rejectMentorSchema.parse(req.body);
    const activeMentor = await User.exists({ _id: id, role: 'mentor', isActive: true });
    if (!activeMentor) return next(new AppError('Mentor not found.', 404, 'NOT_FOUND'));

    const profile = await MentorProfile.findOneAndUpdate(
      { userId: id },
      { $set: { approvalStatus: 'rejected', rejectionReason: reason } },
      { new: true, runValidators: true }
    ).populate('userId', 'name email').lean();
    if (!profile) return next(new AppError('Mentor profile not found.', 404, 'NOT_FOUND'));
    return res.status(200).json({ mentor: presentMentor(profile) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listMentors, approveMentor, rejectMentor };