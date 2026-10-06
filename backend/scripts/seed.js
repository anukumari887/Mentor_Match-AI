const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const logger = require('../src/config/logger');
const { connectMongoWithRetry } = require('../src/config/database');
const User = require('../src/models/User');
const LearnerProfile = require('../src/models/LearnerProfile');
const MentorProfile = require('../src/models/MentorProfile');
const Booking = require('../src/models/Booking');
const Review = require('../src/models/Review');

const demoPassword = 'Demo@12345';
const mentors = [
  { name: 'Amit Sharma', skills: ['Python', 'Machine Learning', 'Data Science'], headline: 'Machine learning engineer and practical mentor', bio: 'I help early-career engineers build sound ML foundations and ship useful data products.', experienceYears: 9, pricePerHour: 900, ratingAvg: 0, ratingCount: 0 },
  { name: 'Neha Verma', skills: ['JavaScript', 'React', 'UI/UX'], headline: 'Frontend engineer focused on accessible products', bio: 'We can work through frontend fundamentals, component design, and portfolio projects.', experienceYears: 6, pricePerHour: 700, ratingAvg: 0, ratingCount: 0 },
  { name: 'Rohan Iyer', skills: ['Node.js', 'JavaScript', 'System Design'], headline: 'Backend engineer and system design mentor', bio: 'I mentor developers moving from feature work into reliable backend architecture.', experienceYears: 11, pricePerHour: 1200, ratingAvg: 0, ratingCount: 0 },
  { name: 'Priya Nair', skills: ['SQL', 'Data Science', 'Python'], headline: 'Analytics lead helping teams make better decisions', bio: 'Build confidence in SQL, analytics workflows, and communicating insights.', experienceYears: 8, pricePerHour: 800, ratingAvg: 0, ratingCount: 0 },
  { name: 'Karan Mehta', skills: ['Java', 'Data Structures', 'Interview Prep'], headline: 'Software engineer specializing in interview preparation', bio: 'Structured practice for algorithms, technical interviews, and career transitions.', experienceYears: 7, pricePerHour: 600, ratingAvg: 0, ratingCount: 0 },
  { name: 'Sana Khan', skills: ['DevOps', 'Cloud', 'Kubernetes'], headline: 'Cloud platform engineer', bio: 'Learn deployment, infrastructure fundamentals, and operational habits from real projects.', experienceYears: 10, pricePerHour: 1500, ratingAvg: 0, ratingCount: 0 },
  { name: 'Vikram Rao', skills: ['React', 'JavaScript', 'UI/UX'], headline: 'Product-minded frontend architect', bio: 'I help teams make interfaces faster, clearer, and easier to maintain.', experienceYears: 13, pricePerHour: 1400, ratingAvg: 0, ratingCount: 0 },
  { name: 'Meera Joshi', skills: ['Python', 'Data Structures', 'Machine Learning'], headline: 'Applied AI researcher and mentor', bio: 'Move from coding exercises to understanding and applying machine learning systems.', experienceYears: 5, pricePerHour: 500, ratingAvg: 0, ratingCount: 0 },
  { name: 'Arjun Das', skills: ['Java', 'Cloud', 'System Design'], headline: 'Staff engineer coaching senior ICs', bio: 'Architecture reviews and guidance for growing into technical leadership.', experienceYears: 15, pricePerHour: 1500, ratingAvg: 0, ratingCount: 0 },
  { name: 'Isha Patel', skills: ['SQL', 'Python', 'Interview Prep'], headline: 'Data analyst and interview coach', bio: 'Practice practical analytics problems and tell a stronger career story.', experienceYears: 4, pricePerHour: 400, ratingAvg: 0, ratingCount: 0 },
  { name: 'Dev Malhotra', skills: ['Node.js', 'DevOps', 'Cloud'], headline: 'Platform engineer building dependable services', bio: 'Learn how deployment, observability, and backend systems fit together.', experienceYears: 9, pricePerHour: 1100, ratingAvg: 0, ratingCount: 0 },
  { name: 'Tara Menon', skills: ['UI/UX', 'React', 'Product Design'], headline: 'Design systems lead and frontend collaborator', bio: 'Turn interface ideas into clear design decisions and implementation plans.', experienceYears: 7, pricePerHour: 1000, ratingAvg: 0, ratingCount: 0 },
  { name: 'Kabir Sethi', skills: ['JavaScript', 'Node.js', 'System Design'], headline: 'Backend mentor for pending approval', bio: 'Focused mentoring for practical backend development.', experienceYears: 5, pricePerHour: 600, ratingAvg: 0, ratingCount: 0 },
  { name: 'Nisha Reddy', skills: ['Python', 'Machine Learning', 'SQL'], headline: 'Data science mentor for pending approval', bio: 'Guidance on data foundations and machine learning practice.', experienceYears: 6, pricePerHour: 750, ratingAvg: 0, ratingCount: 0 }
];

const learners = [
  { name: 'Aarav Gupta', goals: 'Move into backend engineering', knownSkills: ['JavaScript'], wantedSkills: ['Node.js', 'System Design'], level: 'intermediate', budgetPerHour: 900 },
  { name: 'Diya Shah', goals: 'Build a portfolio in data science', knownSkills: ['SQL'], wantedSkills: ['Python', 'Data Science'], level: 'beginner', budgetPerHour: 700 },
  { name: 'Ishaan Roy', goals: 'Prepare for product engineering interviews', knownSkills: ['Java'], wantedSkills: ['Data Structures', 'Interview Prep'], level: 'intermediate', budgetPerHour: 600 },
  { name: 'Mira Kulkarni', goals: 'Grow into a frontend role', knownSkills: ['HTML', 'CSS'], wantedSkills: ['React', 'UI/UX'], level: 'beginner', budgetPerHour: 800 },
  { name: 'Aditya Bose', goals: 'Understand cloud deployment', knownSkills: ['Python'], wantedSkills: ['Cloud', 'DevOps'], level: 'advanced', budgetPerHour: 1200 }
];

async function upsertUser({ name, email, role, passwordHash }) {
  return User.findOneAndUpdate(
    { email },
    { $setOnInsert: { name, email, role, passwordHash, isActive: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  if (env.NODE_ENV === 'production') throw new Error('Seed data is disabled in production.');
  await connectMongoWithRetry();
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const mentorUsers = [];
  const learnerUsers = [];

  for (const [index, mentor] of mentors.entries()) {
    const email = `mentor${String(index + 1).padStart(2, '0')}@mentormatch.local`;
    const user = await upsertUser({ name: mentor.name, email, role: 'mentor', passwordHash });
    mentorUsers.push(user);
    const availability = [
      { dayOfWeek: index % 7, startTime: '18:00', endTime: '21:00' },
      { dayOfWeek: (index + 3) % 7, startTime: '10:00', endTime: '12:00' }
    ];
    await MentorProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: {
        headline: mentor.headline,
        bio: mentor.bio,
        skills: mentor.skills,
        experienceYears: mentor.experienceYears,
        pricePerHour: mentor.pricePerHour,
        availability,
        timezone: 'Asia/Kolkata',
        approvalStatus: index < 12 ? 'approved' : 'pending'
      } },
      { new: true, upsert: true, runValidators: true }
    );
  }

  for (const [index, learner] of learners.entries()) {
    const email = `learner${String(index + 1).padStart(2, '0')}@mentormatch.local`;
    const user = await upsertUser({ name: learner.name, email, role: 'learner', passwordHash });
    learnerUsers.push(user);
    await LearnerProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: {
        goals: learner.goals,
        knownSkills: learner.knownSkills,
        wantedSkills: learner.wantedSkills,
        level: learner.level,
        budgetPerHour: learner.budgetPerHour,
        availability: [{ dayOfWeek: index % 7, startTime: '17:00', endTime: '21:00' }]
      } },
      { new: true, upsert: true, runValidators: true }
    );
  }

  const ratings = [5, 4, 5];
  for (let index = 0; index < ratings.length; index++) {
    const learner = learnerUsers[index];
    const mentor = mentorUsers[index];
    const startTime = new Date(Date.UTC(2025, 0, index + 10, 10));
    const booking = await Booking.findOneAndUpdate(
      { learnerId: learner._id, mentorId: mentor._id, startTime },
      { $set: {
        endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
        priceAtBooking: mentors[index].pricePerHour,
        status: 'completed',
        holdsSlot: true,
        completedAt: new Date(startTime.getTime() + 60 * 60 * 1000),
        hasReview: true
      } },
      { new: true, upsert: true, runValidators: true }
    );
    await Review.findOneAndUpdate(
      { bookingId: booking._id },
      { $set: {
        learnerId: learner._id,
        mentorId: mentor._id,
        rating: ratings[index],
        comment: ['Clear explanations and a useful plan.', 'Practical advice I could apply immediately.', 'A focused, thoughtful session.'][index]
      } },
      { new: true, upsert: true, runValidators: true }
    );
  }

  for (let index = 0; index < ratings.length; index++) {
    const aggregate = await Review.aggregate([
      { $match: { mentorId: mentorUsers[index]._id } },
      { $group: { _id: '$mentorId', ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } }
    ]);
    await MentorProfile.updateOne(
      { userId: mentorUsers[index]._id },
      { $set: { ratingAvg: aggregate[0].ratingAvg, ratingCount: aggregate[0].ratingCount } }
    );
  }

  logger.info({ mentors: mentorUsers.length, approvedMentors: 12, pendingMentors: 2, learners: learnerUsers.length, reviews: ratings.length }, 'Demo seed completed');
}

if (require.main === module) {
  seed()
    .catch((error) => {
      logger.error({ message: error.message }, 'Demo seed failed');
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    });
}

module.exports = { seed };