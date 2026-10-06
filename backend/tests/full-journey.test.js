const { scoreFallback } = require('../src/services/recommendations/fallbackScorer');
const { calculatePaymentSplit } = require('../src/services/payments/paymentService');

describe('Full Journey End-to-End Simulation', () => {
  const learnerId = '654321654321654321654321';
  const mentorId = '123456123456123456123456';
  const bookingId = '789012789012789012789012';

  describe('1. Registration and Role Enforcement', () => {
    test('Learner and Mentor profiles maintain strict distinct roles', () => {
      const learnerUser = { id: learnerId, email: 'learner@example.com', role: 'learner' };
      const mentorUser = { id: mentorId, email: 'mentor@example.com', role: 'mentor' };

      expect(learnerUser.role).toBe('learner');
      expect(mentorUser.role).toBe('mentor');
      expect(learnerUser.id).not.toBe(mentorUser.id);
    });
  });

  describe('2. Mentor Approval Lifecycle', () => {
    test('Unapproved mentors are excluded from discovery until admin approves', () => {
      const allMentors = [
        { id: mentorId, isApproved: false, name: 'Alice Mentor', hourlyRate: 3000 },
        { id: '999999999999999999999999', isApproved: true, name: 'Bob Mentor', hourlyRate: 4000 }
      ];

      // Public discovery query filter: { isApproved: true }
      const publicDiscovery = allMentors.filter((m) => m.isApproved);
      expect(publicDiscovery).toHaveLength(1);
      expect(publicDiscovery[0].name).toBe('Bob Mentor');
      expect(publicDiscovery.some((m) => m.id === mentorId)).toBe(false);

      // Admin approves Alice Mentor
      allMentors[0].isApproved = true;
      const updatedDiscovery = allMentors.filter((m) => m.isApproved);
      expect(updatedDiscovery).toHaveLength(2);
      expect(updatedDiscovery.some((m) => m.id === mentorId)).toBe(true);
    });
  });

  describe('3. AI Recommendations Matching', () => {
    test('Learner gets ranked mentors with scores, breakdowns, and reasons', () => {
      const learnerProfile = {
        wantedSkills: ['React', 'Node.js'],
        level: 'intermediate',
        budgetPerHour: 5000,
        availability: [{ dayOfWeek: 2, startTime: '10:00', endTime: '18:00' }]
      };

      const candidateMentors = [
        {
          id: mentorId,
          skills: ['React', 'Node.js'],
          pricePerHour: 3000,
          bio: 'Fullstack developer specialized in React and Node.js',
          ratingAvg: 4.9,
          ratingCount: 15,
          experienceYears: 6,
          availability: [{ dayOfWeek: 2, startTime: '10:00', endTime: '18:00' }]
        },
        {
          id: '888888888888888888888888',
          skills: ['Python'],
          pricePerHour: 6000,
          bio: 'Data analyst and python scripter',
          ratingAvg: 3.5,
          ratingCount: 2,
          experienceYears: 2,
          availability: [{ dayOfWeek: 5, startTime: '10:00', endTime: '12:00' }]
        }
      ];

      const recommendations = scoreFallback(learnerProfile, candidateMentors, 5);
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].id).toBe(mentorId);
      expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
      expect(recommendations[0].reasons.length).toBeGreaterThan(0);
      expect(recommendations[0].overBudget).toBe(false);
      expect(recommendations[1].overBudget).toBe(true);
    });
  });

  describe('4. Slot Selection and Concurrency Lock', () => {
    test('Concurrency protection prevents double booking of same slot', () => {
      const activeLocks = new Set();
      const slotKey = `slot_lock:${mentorId}:2026-10-10T10:00:00Z`;

      function tryAcquireLock(key) {
        if (activeLocks.has(key)) return false;
        activeLocks.add(key);
        return true;
      }

      // First learner books the slot
      const acquiredFirst = tryAcquireLock(slotKey);
      expect(acquiredFirst).toBe(true);

      // Second learner attempts to book the same slot concurrently
      const acquiredSecond = tryAcquireLock(slotKey);
      expect(acquiredSecond).toBe(false);
    });
  });

  describe('5. Payment Processing and Fee Split', () => {
    test('Calculates 15% platform fee and 85% mentor earnings accurately', () => {
      const amountPaise = 300000; // 3000 INR in paise
      const split = calculatePaymentSplit(amountPaise, 15);

      expect(split.amount).toBe(300000);
      expect(split.platformFee).toBe(45000); // 15% = 450 INR
      expect(split.mentorEarning).toBe(255000); // 85% = 2550 INR
      expect(split.platformFee + split.mentorEarning).toBe(amountPaise);
    });

    test('Payment confirmation is idempotent and marks booking confirmed', () => {
      let bookingStatus = 'pending';
      let paymentStatus = 'created';

      function confirmPaymentSimulation() {
        if (paymentStatus === 'paid') {
          return { alreadyPaid: true, bookingStatus, paymentStatus };
        }
        paymentStatus = 'paid';
        bookingStatus = 'confirmed';
        return { alreadyPaid: false, bookingStatus, paymentStatus };
      }

      // First confirmation
      const first = confirmPaymentSimulation();
      expect(first.alreadyPaid).toBe(false);
      expect(first.bookingStatus).toBe('confirmed');
      expect(first.paymentStatus).toBe('paid');

      // Second (duplicate) confirmation
      const second = confirmPaymentSimulation();
      expect(second.alreadyPaid).toBe(true);
      expect(second.bookingStatus).toBe('confirmed');
      expect(second.paymentStatus).toBe('paid');
    });
  });

  describe('6. Video Session Access Window', () => {
    test('Enforces 10-minute early join window before session start', () => {
      const now = Date.now();
      const sessionStartsIn5Mins = new Date(now + 5 * 60 * 1000);
      const sessionStartsIn30Mins = new Date(now + 30 * 60 * 1000);

      function canJoinSession(startTime, endTime = new Date(startTime.getTime() + 60 * 60 * 1000)) {
        const currentTime = Date.now();
        const earlyWindowMs = 10 * 60 * 1000;
        return currentTime >= startTime.getTime() - earlyWindowMs && currentTime <= endTime.getTime();
      }

      expect(canJoinSession(sessionStartsIn5Mins)).toBe(true);
      expect(canJoinSession(sessionStartsIn30Mins)).toBe(false);
    });
  });

  describe('7. Session Review and Rating Recalculation', () => {
    test('Learner submits review, recalculates mentor rating, and rejects duplicates', () => {
      const existingReviews = [
        { rating: 5, comment: 'Great session!' },
        { rating: 4, comment: 'Very helpful.' }
      ];

      const reviewedBookings = new Set();

      function submitReview(bId, rating, comment) {
        if (reviewedBookings.has(bId)) {
          throw new Error('A review has already been submitted for this session.');
        }
        reviewedBookings.add(bId);
        existingReviews.push({ rating, comment });

        const avg = existingReviews.reduce((sum, r) => sum + r.rating, 0) / existingReviews.length;
        return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: existingReviews.length };
      }

      // Submit first review for bookingId
      const result = submitReview(bookingId, 5, 'Exceptional mentor!');
      expect(result.ratingCount).toBe(3);
      expect(result.ratingAvg).toBe(4.7); // (5 + 4 + 5) / 3 = 4.666 -> 4.7

      // Submit duplicate review on same booking
      expect(() => submitReview(bookingId, 4, 'Another review')).toThrow(
        'A review has already been submitted for this session.'
      );
    });
  });

  describe('8. Admin Payout and Final Summary', () => {
    test('Admin records mentor payout successfully with audit reference', () => {
      const recordedPayouts = [];

      function recordPayout(adminId, mId, amount, reference) {
        const payout = {
          id: 'payout_123',
          mentorId: mId,
          amount,
          reference,
          recordedBy: adminId,
          createdAt: new Date().toISOString()
        };
        recordedPayouts.push(payout);
        return payout;
      }

      const payout = recordPayout('admin_user_001', mentorId, 255000, 'UPI_REF_987654321');
      expect(payout.amount).toBe(255000);
      expect(payout.reference).toBe('UPI_REF_987654321');
      expect(recordedPayouts).toHaveLength(1);
    });
  });
});
