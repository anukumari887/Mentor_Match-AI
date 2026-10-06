const User = require('../models/User');
const MentorProfile = require('../models/MentorProfile');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const Complaint = require('../models/Complaint');
const FeedbackEvent = require('../models/FeedbackEvent');
const { AppError } = require('../utils/errors');
const adminMentorController = require('./adminMentor.controller');
const {
  objectIdSchema,
  adminUsersQuerySchema,
  updateUserStatusSchema,
  adminBookingsQuerySchema,
  adminPaymentsQuerySchema,
  markRefundedSchema,
  recordPayoutSchema,
  adminComplaintsQuerySchema
} = require('../validations/admin.validation');
const { resolveComplaintSchema } = require('../validations/complaint.validation');

async function getStats(req, res, next) {
  try {
    const [
      userCounts,
      mentorCounts,
      bookingCounts,
      paidPaymentAgg,
      refundDueAgg,
      earnedMentorAgg,
      payoutsAgg,
      bookedEventsCount,
      recEventsCount
    ] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      MentorProfile.aggregate([
        { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: null,
            gmv: { $sum: '$amount' },
            platformFees: { $sum: '$platformFee' }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: 'refund_due' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]),
      Payment.aggregate([
        { $match: { status: 'paid', earned: true } },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$mentorEarning' }
          }
        }
      ]),
      Payout.aggregate([
        {
          $group: {
            _id: null,
            totalPaidOut: { $sum: '$amount' }
          }
        }
      ]),
      FeedbackEvent.countDocuments({ eventType: 'booked' }),
      FeedbackEvent.countDocuments({ eventType: 'recommended' })
    ]);

    const usersByRole = userCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    const totalUsers = (usersByRole.learner || 0) + (usersByRole.mentor || 0) + (usersByRole.admin || 0);

    const mentorsByStatus = mentorCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    const totalMentors = (mentorsByStatus.pending || 0) + (mentorsByStatus.approved || 0) + (mentorsByStatus.rejected || 0);

    const bookingsByStatus = bookingCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    const totalBookings = Object.values(bookingsByStatus).reduce((a, b) => a + b, 0);

    const gmv = paidPaymentAgg[0]?.gmv || 0;
    const platformFees = paidPaymentAgg[0]?.platformFees || 0;
    const totalEarned = earnedMentorAgg[0]?.totalEarned || 0;
    const totalPaidOut = payoutsAgg[0]?.totalPaidOut || 0;
    const owedToMentors = Math.max(0, totalEarned - totalPaidOut);

    const refundsDueCount = refundDueAgg[0]?.count || 0;
    const refundsDueAmount = refundDueAgg[0]?.amount || 0;

    const recommendationBookingRate = recEventsCount > 0
      ? Number(((bookedEventsCount / recEventsCount) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      users: {
        total: totalUsers,
        learners: usersByRole.learner || 0,
        mentors: usersByRole.mentor || 0,
        admins: usersByRole.admin || 0
      },
      mentors: {
        total: totalMentors,
        pending: mentorsByStatus.pending || 0,
        approved: mentorsByStatus.approved || 0,
        rejected: mentorsByStatus.rejected || 0
      },
      bookings: {
        total: totalBookings,
        pending: bookingsByStatus.pending || 0,
        confirmed: bookingsByStatus.confirmed || 0,
        completed: bookingsByStatus.completed || 0,
        cancelled: bookingsByStatus.cancelled || 0,
        expired: bookingsByStatus.expired || 0
      },
      financials: {
        gmv,
        platformFees,
        owedToMentors,
        totalPaidOut
      },
      refundsDue: {
        count: refundsDueCount,
        amount: refundsDueAmount
      },
      recommendationBookingRate
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const query = adminUsersQuerySchema.parse(req.query);
    const filter = {};

    if (query.role) filter.role = query.role;
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    if (query.q) {
      const sanitized = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } }
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      items: users,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const { isActive } = updateUserStatusSchema.parse(req.body);

    if (String(req.user._id) === id && !isActive) {
      return next(new AppError('You cannot deactivate your own admin account.', 400, 'CANNOT_DEACTIVATE_SELF'));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    ).select('-passwordHash').lean();

    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const query = adminBookingsQuerySchema.parse(req.query);
    const filter = {};

    if (query.status) filter.status = query.status;
    if (query.mentorId) filter.mentorId = query.mentorId;
    if (query.learnerId) filter.learnerId = query.learnerId;

    const skip = (query.page - 1) * query.limit;
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('learnerId', 'name email')
        .populate('mentorId', 'name email')
        .lean(),
      Booking.countDocuments(filter)
    ]);

    return res.status(200).json({
      items: bookings,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const query = adminPaymentsQuerySchema.parse(req.query);
    const filter = {};

    if (query.status) filter.status = query.status;

    const skip = (query.page - 1) * query.limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('learnerId', 'name email')
        .populate('mentorId', 'name email')
        .populate('bookingId', 'startTime endTime priceAtBooking status')
        .lean(),
      Payment.countDocuments(filter)
    ]);

    return res.status(200).json({
      items: payments,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

async function markPaymentRefunded(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const { refundReference } = markRefundedSchema.parse(req.body);

    const payment = await Payment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found.', 404, 'PAYMENT_NOT_FOUND'));
    }

    if (payment.status !== 'refund_due') {
      return next(new AppError('Only payments with status refund_due can be marked as refunded.', 400, 'INVALID_PAYMENT_STATUS'));
    }

    payment.status = 'refunded';
    payment.refundReference = refundReference;
    payment.refundedAt = new Date();
    await payment.save();

    return res.status(200).json({ payment });
  } catch (error) {
    return next(error);
  }
}

async function getPayoutsSummary(req, res, next) {
  try {
    const mentors = await User.find({ role: 'mentor' }).select('name email').lean();

    const [earningsAgg, payoutsAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid', earned: true } },
        {
          $group: {
            _id: '$mentorId',
            earned: { $sum: '$mentorEarning' }
          }
        }
      ]),
      Payout.aggregate([
        {
          $group: {
            _id: '$mentorId',
            paidOut: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const earningsMap = new Map(earningsAgg.map((item) => [String(item._id), item.earned]));
    const payoutsMap = new Map(payoutsAgg.map((item) => [String(item._id), item.paidOut]));

    const summary = mentors.map((mentor) => {
      const mentorIdStr = String(mentor._id);
      const earned = earningsMap.get(mentorIdStr) || 0;
      const paidOut = payoutsMap.get(mentorIdStr) || 0;
      const balance = Math.max(0, earned - paidOut);

      return {
        mentorId: mentor._id,
        mentorName: mentor.name,
        mentorEmail: mentor.email,
        earned,
        paidOut,
        balance
      };
    }).sort((a, b) => b.balance - a.balance);

    return res.status(200).json({ summary });
  } catch (error) {
    return next(error);
  }
}

async function recordPayout(req, res, next) {
  try {
    const data = recordPayoutSchema.parse(req.body);
    const mentor = await User.findOne({ _id: data.mentorId, role: 'mentor' }).lean();
    if (!mentor) {
      return next(new AppError('Mentor not found.', 404, 'MENTOR_NOT_FOUND'));
    }

    const [earningsAgg, payoutsAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { mentorId: mentor._id, status: 'paid', earned: true } },
        { $group: { _id: '$mentorId', earned: { $sum: '$mentorEarning' } } }
      ]),
      Payout.aggregate([
        { $match: { mentorId: mentor._id } },
        { $group: { _id: '$mentorId', paidOut: { $sum: '$amount' } } }
      ])
    ]);

    const earned = earningsAgg[0]?.earned || 0;
    const paidOut = payoutsAgg[0]?.paidOut || 0;
    const balance = Math.max(0, earned - paidOut);

    if (data.amount > balance) {
      return next(new AppError(`Payout amount exceeds mentor available balance of Rs. ${(balance / 100).toFixed(2)}.`, 400, 'INSUFFICIENT_BALANCE'));
    }

    const payout = await Payout.create({
      mentorId: mentor._id,
      amount: data.amount,
      reference: data.reference,
      recordedBy: req.user._id
    });

    const populated = await Payout.findById(payout._id)
      .populate('mentorId', 'name email')
      .populate('recordedBy', 'name email')
      .lean();

    return res.status(201).json({ payout: populated });
  } catch (error) {
    return next(error);
  }
}

async function listPayouts(req, res, next) {
  try {
    const payouts = await Payout.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('mentorId', 'name email')
      .populate('recordedBy', 'name email')
      .lean();

    return res.status(200).json({ payouts });
  } catch (error) {
    return next(error);
  }
}

async function listComplaints(req, res, next) {
  try {
    const query = adminComplaintsQuerySchema.parse(req.query);
    const filter = {};
    if (query.status) filter.status = query.status;

    const skip = (query.page - 1) * query.limit;
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('userId', 'name email role')
        .populate('bookingId', 'startTime endTime priceAtBooking')
        .lean(),
      Complaint.countDocuments(filter)
    ]);

    return res.status(200).json({
      items: complaints,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    });
  } catch (error) {
    return next(error);
  }
}

async function resolveComplaint(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const { resolutionNote } = resolveComplaintSchema.parse(req.body);

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return next(new AppError('Complaint not found.', 404, 'COMPLAINT_NOT_FOUND'));
    }

    complaint.status = 'resolved';
    complaint.resolutionNote = resolutionNote;
    complaint.resolvedAt = new Date();
    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('userId', 'name email role')
      .populate('bookingId', 'startTime endTime priceAtBooking')
      .lean();

    return res.status(200).json({ complaint: populated });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStats,
  listUsers,
  updateUserStatus,
  listBookings,
  listPayments,
  markPaymentRefunded,
  getPayoutsSummary,
  recordPayout,
  listPayouts,
  listComplaints,
  resolveComplaint,
  // Mentor approval backwards compatibility
  listMentors: adminMentorController.listMentors,
  approveMentor: adminMentorController.approveMentor,
  rejectMentor: adminMentorController.rejectMentor
};
