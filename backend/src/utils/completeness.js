/**
 * Calculates mentor profile completeness and missing fields.
 * Used exclusively for mentor approval workflows and checklists.
 */

function calculateMentorCompleteness(profile) {
  if (!profile) {
    return {
      isComplete: false,
      missing: [
        { key: 'headline', label: 'Professional headline', link: '/profile#headline' },
        { key: 'bio', label: 'Bio summary', link: '/profile#bio' },
        { key: 'skills', label: 'At least one technical skill', link: '/profile#skills' },
        { key: 'pricePerHour', label: 'Hourly session rate (min ₹100)', link: '/profile#price' },
        { key: 'availability', label: 'At least one weekly availability slot', link: '/profile#availability' }
      ]
    };
  }

  const missing = [];
  if (!profile.headline || !profile.headline.trim()) {
    missing.push({ key: 'headline', label: 'Professional headline', link: '/profile#headline' });
  }
  if (!profile.bio || !profile.bio.trim()) {
    missing.push({ key: 'bio', label: 'Bio summary', link: '/profile#bio' });
  }
  if (!profile.skills || !Array.isArray(profile.skills) || profile.skills.length === 0) {
    missing.push({ key: 'skills', label: 'At least one technical skill', link: '/profile#skills' });
  }
  if (!profile.pricePerHour || Number(profile.pricePerHour) < 100) {
    missing.push({ key: 'pricePerHour', label: 'Hourly session rate (min ₹100)', link: '/profile#price' });
  }
  if (!profile.availability || !Array.isArray(profile.availability) || profile.availability.length === 0) {
    missing.push({ key: 'availability', label: 'At least one weekly availability slot', link: '/profile#availability' });
  }

  return {
    isComplete: missing.length === 0,
    missing
  };
}

function formatMentorProfile(profile) {
  if (!profile) return null;
  const obj = typeof profile.toObject === 'function' ? profile.toObject() : { ...profile };
  obj.profileCompleteness = calculateMentorCompleteness(obj);
  return obj;
}

async function triggerMentorAdminReviewNotification(mentorId) {
  const User = require('../models/User');
  const MentorProfile = require('../models/MentorProfile');
  const { sendAdminMentorReviewEmail } = require('../services/email');

  const mentorUser = await User.findById(mentorId);
  if (!mentorUser || mentorUser.role !== 'mentor' || !mentorUser.emailVerified) {
    return false;
  }

  const profile = await MentorProfile.findOne({ userId: mentorId });
  if (!profile || profile.approvalStatus !== 'pending' || profile.adminNotifiedAt) {
    return false;
  }

  const completeness = calculateMentorCompleteness(profile);
  if (!completeness.isComplete) {
    return false;
  }

  const claimed = await MentorProfile.findOneAndUpdate(
    { userId: mentorId, approvalStatus: 'pending', adminNotifiedAt: null },
    { $set: { adminNotifiedAt: new Date() } },
    { new: true }
  );

  if (claimed) {
    await sendAdminMentorReviewEmail(mentorUser).catch(() => {});
    return true;
  }
  return false;
}

module.exports = {
  calculateMentorCompleteness,
  formatMentorProfile,
  triggerMentorAdminReviewNotification
};
