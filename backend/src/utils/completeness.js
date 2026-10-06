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

module.exports = {
  calculateMentorCompleteness,
  formatMentorProfile
};
