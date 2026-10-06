jest.mock('../src/models/User', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/Booking', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/Payment', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/Payout', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/models/Complaint', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../src/models/FeedbackEvent', () => ({
  countDocuments: jest.fn()
}));

jest.mock('../src/utils/token', () => ({
  COOKIE_NAME: 'token',
  verifyToken: jest.fn()
}));

const User = require('../src/models/User');
const MentorProfile = require('../src/models/MentorProfile');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Payout = require('../src/models/Payout');
const Complaint = require('../src/models/Complaint');
const FeedbackEvent = require('../src/models/FeedbackEvent');
const adminController = require('../src/controllers/admin.controller');
const complaintController = require('../src/controllers/complaint.controller');
const { requireRole } = require('../src/middlewares/auth');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('Phase 9: Admin, complaints, payouts and role enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role Enforcement', () => {
    it('rejects learners from admin routes with 403 Forbidden', () => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'learner', email: 'learner@example.com' } };
      const res = createResponse();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('rejects mentors from admin routes with 403 Forbidden', () => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'mentor', email: 'mentor@example.com' } };
      const res = createResponse();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('allows admin users through', () => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'admin', email: 'admin@mentormatch.test' } };
      const res = createResponse();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Platform Stats Calculation', () => {
    it('computes accurate platform financials and metrics matching real database aggregates', async () => {
      User.aggregate.mockResolvedValue([
        { _id: 'learner', count: 10 },
        { _id: 'mentor', count: 5 },
        { _id: 'admin', count: 1 }
      ]);
      MentorProfile.aggregate.mockResolvedValue([
        { _id: 'approved', count: 4 },
        { _id: 'pending', count: 1 }
      ]);
      Booking.aggregate.mockResolvedValue([
        { _id: 'completed', count: 8 },
        { _id: 'confirmed', count: 2 },
        { _id: 'cancelled', count: 1 }
      ]);
      Payment.aggregate
        .mockResolvedValueOnce([{ _id: null, gmv: 500000, platformFees: 75000 }]) // GMV & fees
        .mockResolvedValueOnce([{ _id: null, count: 1, amount: 50000 }]) // refunds due
        .mockResolvedValueOnce([{ _id: null, totalEarned: 425000 }]); // mentor earnings
      Payout.aggregate.mockResolvedValue([{ _id: null, totalPaidOut: 150000 }]);
      FeedbackEvent.countDocuments
        .mockResolvedValueOnce(12) // booked
        .mockResolvedValueOnce(40); // recommended

      const req = { user: { role: 'admin' } };
      const res = createResponse();
      const next = jest.fn();

      await adminController.getStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: { total: 16, learners: 10, mentors: 5, admins: 1 },
        mentors: { total: 5, pending: 1, approved: 4, rejected: 0 },
        bookings: { total: 11, pending: 0, confirmed: 2, completed: 8, cancelled: 1, expired: 0 },
        financials: {
          gmv: 500000,
          platformFees: 75000,
          owedToMentors: 275000, // 425000 earned - 150000 paid out
          totalPaidOut: 150000
        },
        refundsDue: {
          count: 1,
          amount: 50000
        },
        recommendationBookingRate: 30.0
      });
    });
  });

  describe('User Status Management', () => {
    it('prevents an admin from deactivating their own account', async () => {
      const adminId = '507f1f77bcf86cd799439011';
      const req = {
        params: { id: adminId },
        body: { isActive: false },
        user: { _id: adminId, role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.updateUserStatus(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CANNOT_DEACTIVATE_SELF');
    });

    it('allows an admin to update active status of other users', async () => {
      const targetUserId = '507f1f77bcf86cd799439012';
      const adminId = '507f1f77bcf86cd799439011';
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: targetUserId, isActive: false })
        })
      });

      const req = {
        params: { id: targetUserId },
        body: { isActive: false },
        user: { _id: adminId, role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.updateUserStatus(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: { _id: targetUserId, isActive: false } });
    });
  });

  describe('Payments and Refunds Handling', () => {
    it('marks a refund_due payment as refunded with refund reference', async () => {
      const paymentId = '507f1f77bcf86cd799439021';
      const mockPayment = {
        _id: paymentId,
        status: 'refund_due',
        save: jest.fn().mockResolvedValue(true)
      };
      Payment.findById.mockResolvedValue(mockPayment);

      const req = {
        params: { id: paymentId },
        body: { refundReference: 'RFND_RZP_998877' },
        user: { role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.markPaymentRefunded(req, res, next);

      expect(mockPayment.status).toBe('refunded');
      expect(mockPayment.refundReference).toBe('RFND_RZP_998877');
      expect(mockPayment.refundedAt).toBeDefined();
      expect(mockPayment.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects marking non-refund_due payments as refunded', async () => {
      const paymentId = '507f1f77bcf86cd799439022';
      const mockPayment = {
        _id: paymentId,
        status: 'paid'
      };
      Payment.findById.mockResolvedValue(mockPayment);

      const req = {
        params: { id: paymentId },
        body: { refundReference: 'RFND_RZP_998877' },
        user: { role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.markPaymentRefunded(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_PAYMENT_STATUS');
    });
  });

  describe('Payouts and Mentor Balances', () => {
    it('calculates payout summary per mentor showing earned, paidOut and balance', async () => {
      const mentorId = '507f1f77bcf86cd799439031';
      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: mentorId, name: 'Ananya Sharma', email: 'ananya@example.com' }
          ])
        })
      });
      Payment.aggregate.mockResolvedValue([{ _id: mentorId, earned: 85000 }]);
      Payout.aggregate.mockResolvedValue([{ _id: mentorId, paidOut: 30000 }]);

      const req = { user: { role: 'admin' } };
      const res = createResponse();
      const next = jest.fn();

      await adminController.getPayoutsSummary(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        summary: [
          {
            mentorId,
            mentorName: 'Ananya Sharma',
            mentorEmail: 'ananya@example.com',
            earned: 85000,
            paidOut: 30000,
            balance: 55000
          }
        ]
      });
    });

    it('records a payout when amount is within mentor balance', async () => {
      const mentorId = '507f1f77bcf86cd799439031';
      const adminId = '507f1f77bcf86cd799439011';
      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: mentorId, role: 'mentor' })
      });
      Payment.aggregate.mockResolvedValue([{ _id: mentorId, earned: 50000 }]);
      Payout.aggregate.mockResolvedValue([{ _id: mentorId, paidOut: 0 }]);
      Payout.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439041' });
      Payout.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439041',
          mentorId: { name: 'Ananya Sharma' },
          amount: 25000,
          reference: 'UPI_TXN_123456'
        })
      });

      const req = {
        body: {
          mentorId,
          amount: 25000,
          reference: 'UPI_TXN_123456'
        },
        user: { _id: adminId, role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.recordPayout(req, res, next);

      expect(Payout.create).toHaveBeenCalledWith({
        mentorId,
        amount: 25000,
        reference: 'UPI_TXN_123456',
        recordedBy: adminId
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects recording a payout that exceeds available mentor balance', async () => {
      const mentorId = '507f1f77bcf86cd799439031';
      User.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: mentorId, role: 'mentor' })
      });
      Payment.aggregate.mockResolvedValue([{ _id: mentorId, earned: 20000 }]);
      Payout.aggregate.mockResolvedValue([{ _id: mentorId, paidOut: 15000 }]); // balance is only 5000

      const req = {
        body: {
          mentorId,
          amount: 10000, // exceeds 5000
          reference: 'UPI_TXN_OVERPAY'
        },
        user: { _id: '507f1f77bcf86cd799439011', role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.recordPayout(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('Complaints Flow', () => {
    it('allows participants to submit a complaint', async () => {
      const learnerId = '507f1f77bcf86cd799439051';
      const bookingId = '507f1f77bcf86cd799439061';
      Booking.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: bookingId,
            learnerId,
            mentorId: '507f1f77bcf86cd799439031'
          })
        })
      });
      Complaint.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439071',
        userId: learnerId,
        subject: 'Mentor was 15 minutes late',
        description: 'Mentor arrived late to the consultation call and left early.',
        status: 'open'
      });

      const req = {
        body: {
          bookingId,
          subject: 'Mentor was 15 minutes late',
          description: 'Mentor arrived late to the consultation call and left early.'
        },
        user: { _id: learnerId, role: 'learner' }
      };
      const res = createResponse();
      const next = jest.fn();

      await complaintController.createComplaint(req, res, next);

      expect(Complaint.create).toHaveBeenCalledWith({
        userId: learnerId,
        bookingId,
        subject: 'Mentor was 15 minutes late',
        description: 'Mentor arrived late to the consultation call and left early.',
        status: 'open'
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('allows an admin to resolve a complaint with resolution notes', async () => {
      const complaintId = '507f1f77bcf86cd799439071';
      const mockComplaint = {
        _id: complaintId,
        status: 'open',
        save: jest.fn().mockResolvedValue(true)
      };
      Complaint.findById
        .mockResolvedValueOnce(mockComplaint)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue({
            _id: complaintId,
            status: 'resolved',
            resolutionNote: 'Issued partial credit to learner.'
          })
        });

      const req = {
        params: { id: complaintId },
        body: { resolutionNote: 'Issued partial credit to learner.' },
        user: { role: 'admin' }
      };
      const res = createResponse();
      const next = jest.fn();

      await adminController.resolveComplaint(req, res, next);

      expect(mockComplaint.status).toBe('resolved');
      expect(mockComplaint.resolutionNote).toBe('Issued partial credit to learner.');
      expect(mockComplaint.resolvedAt).toBeDefined();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
