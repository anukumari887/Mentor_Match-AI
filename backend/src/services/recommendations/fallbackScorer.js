const ALIASES = {
  ml: 'machine learning',
  js: 'javascript',
  py: 'python',
  ds: 'data science',
  dsa: 'data structures',
  'react.js': 'react',
  node: 'node.js',
  nodejs: 'node.js'
};

function normalizeSkill(skill) {
  const normalized = String(skill).trim().toLowerCase();
  return ALIASES[normalized] || normalized;
}

function scoreFallback(learner, mentors, limit = 5) {
  const wanted = new Set((learner.wantedSkills || []).map(normalizeSkill).filter(Boolean));
  const results = mentors.map((mentor) => {
    const skills = new Set((mentor.skills || []).map(normalizeSkill).filter(Boolean));
    const intersection = [...wanted].filter((skill) => skills.has(skill));
    const unionSize = new Set([...wanted, ...skills]).size;
    const skill = unionSize ? intersection.length / unionSize : 0;
    const ratingCount = mentor.ratingCount || 0;
    const ratingAverage = ((mentor.ratingAvg || 0) * ratingCount + 4 * 3) / (ratingCount + 3) / 5;
    const ratingWeight = 0.15 * Math.min(ratingCount / 10, 1);
    const skillWeight = 0.65 + 0.15 - ratingWeight;
    const experience = Math.min((mentor.experienceYears || 0) / 10, 1);
    let score = skill * skillWeight + ratingAverage * ratingWeight + experience * 0.2;
    const overBudget = learner.budgetPerHour > 0 && mentor.pricePerHour > learner.budgetPerHour;
    if (overBudget) score *= 0.75;

    const reasons = [];
    if (intersection.length) reasons.push(`Teaches ${intersection.slice(0, 3).join(', ')}`);
    if (mentor.experienceYears) reasons.push(`${mentor.experienceYears} years of experience`);
    if (!overBudget && learner.budgetPerHour > 0) reasons.push('Within your budget');

    return {
      id: mentor.id,
      score: Math.round(score * 1000) / 1000,
      breakdown: {
        skill: Math.round(skill * 1000) / 1000,
        rating: Math.round(ratingAverage * 1000) / 1000,
        experience: Math.round(experience * 1000) / 1000
      },
      reasons: reasons.slice(0, 3),
      overBudget,
      ratingAvg: mentor.ratingAvg || 0,
      experienceYears: mentor.experienceYears || 0
    };
  });

  results.sort((left, right) => right.score - left.score || right.ratingAvg - left.ratingAvg || right.experienceYears - left.experienceYears);
  return results.slice(0, limit).map(({ ratingAvg: _ratingAvg, experienceYears: _experienceYears, ...item }) => item);
}

module.exports = { normalizeSkill, scoreFallback };