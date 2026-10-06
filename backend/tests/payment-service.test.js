jest.mock('../src/models/Booking', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../src/models/Payment', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/services/payments/gateway', () => ({ getGateway: jest.fn() }));
jest.mock('../src/config/env', () => ({ env: {
  PAYMENT_MODE: 'mock',
  PLATFORM_FEE_PERCENT: 15,
  SLOT_LOCK_MINUTES: 10,
  FREE_CANCEL_HOURS: 24,
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: ''
} }));
jest.mock('../src/controllers/booking.controller', () => ({
  slotLockKey: jest.fn(() => 'test-lock'),
  releaseSlotLock: jest.fn()
}));
jest.mock('../src/services/email', () => ({ sendBookingConfirmation: jest.fn() }));

const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const { getGateway } = require('../src/services/payments/gateway');
const { releaseSlotLock } = require('../src/controllers/booking.controller');
const { sendBookingConfirmation } = require('../src/services/email');
const { calculatePaymentSplit, createPaymentOrder, confirmPayment } = require('../src/services/payments/paymentService');

const bookingId = '507f1f77bcf86cd799439011';
const learnerId = '507f1f77bcf86cd799439012';
const mentorId = '507f1f77bcf86cd799439013';

function pendingBooking() {
  return {
    _id: bookingId,
    learnerId,
    mentorId,
    startTime: new Date(Date.now() + 86400000),
    priceAtBooking: 500,
    status: 'pending',
    holdsSlot: true,
    expiresAt: new Date(Date.now() + 5 * 60000)
  };
}

describe('Payment service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calculates fee and mentor earning in integer paise', () => {
    expect(calculatePaymentSplit(50000, 15)).toEqual({ amount: 50000, platformFee: 7500, mentorEarning: 42500 });
    expect(calculatePaymentSplit(101, 15)).toEqual({ amount: 101, platformFee: 15, mentorEarning: 86 });
  });

  it('creates a mock gateway order and saves the split from the booking price', async () => {
    Booking.findOne.mockResolvedValue(pendingBooking());
    Payment.findOne.mockResolvedValue(null);
    getGateway.mockReturnValue({ createOrder: jest.fn().mockResolvedValue({ id: 'mock_order_1' }) });
    Payment.create.mockResolvedValue({
      gateway: 'mock', gatewayOrderId: 'mock_order_1', amount: 50000,
      platformFee: 7500, mentorEarning: 42500, currency: 'INR'
    });

    const result = await createPaymentOrder({ bookingId, learnerId });

    expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 50000,
      platformFee: 7500,
      mentorEarning: 42500,
      gateway: 'mock',
      status: 'created'
    }));
    expect(result).toMatchObject({ gateway: 'mock', orderId: 'mock_order_1', amount: 50000, currency: 'INR' });
  });

  it('reuses an existing created order for the same booking', async () => {
    Booking.findOne.mockResolvedValue(pendingBooking());
    Payment.findOne.mockResolvedValue({
      status: 'created', gateway: 'mock', gatewayOrderId: 'mock_order_existing', amount: 50000, currency: 'INR'
    });

    const result = await createPaymentOrder({ bookingId, learnerId });

    expect(result.orderId).toBe('mock_order_existing');
    expect(getGateway).not.toHaveBeenCalled();
    expect(Payment.create).not.toHaveBeenCalled();
  });

  it('confirms a pending booking and treats repeated confirmations idempotently', async () => {
    const payment = { _id: 'payment-id', bookingId, status: 'created', gatewayOrderId: 'mock_order_1' };
    const confirmed = { ...pendingBooking(), status: 'confirmed' };
    Payment.findOne.mockResolvedValueOnce(payment).mockResolvedValueOnce({ ...payment, status: 'paid' });
    Payment.findOneAndUpdate.mockResolvedValue({ ...payment, status: 'paid', gatewayPaymentId: 'mock_payment_1' });
    Booking.findById
      .mockResolvedValueOnce(pendingBooking())
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(confirmed)
      })
      .mockResolvedValueOnce(confirmed);
    Booking.findOneAndUpdate.mockResolvedValue(confirmed);

    const first = await confirmPayment({ gatewayOrderId: 'mock_order_1', gatewayPaymentId: 'mock_payment_1' });
    const second = await confirmPayment({ gatewayOrderId: 'mock_order_1', gatewayPaymentId: 'mock_payment_1' });

    expect(first.booking.status).toBe('confirmed');
    expect(second.booking.status).toBe('confirmed');
    expect(Payment.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(releaseSlotLock).toHaveBeenCalledWith('test-lock', bookingId);
    expect(sendBookingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('marks late payment on a cancelled booking as refund due', async () => {
    const payment = { _id: 'payment-id', bookingId, status: 'created', gatewayOrderId: 'mock_order_1' };
    Payment.findOne.mockResolvedValue(payment);
    Payment.findOneAndUpdate.mockResolvedValue({ ...payment, status: 'paid' });
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Booking.findById.mockResolvedValue({ ...pendingBooking(), status: 'cancelled', holdsSlot: false });

    const result = await confirmPayment({ gatewayOrderId: 'mock_order_1', gatewayPaymentId: 'mock_payment_1' });

    expect(result.payment.status).toBe('refund_due');
    expect(result.payment.lateArrival).toBe(true);
    expect(Payment.updateOne).toHaveBeenCalledWith(
      { _id: 'payment-id', status: 'paid' },
      { $set: { status: 'refund_due', lateArrival: true } }
    );
  });

  it('marks a late payment as refund due when another booking owns the expired slot', async () => {
    const payment = { _id: 'payment-id', bookingId, status: 'created', gatewayOrderId: 'mock_order_1' };
    Payment.findOne.mockResolvedValue(payment);
    Payment.findOneAndUpdate.mockResolvedValue({ ...payment, status: 'paid' });
    Payment.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Booking.findById.mockResolvedValue({ ...pendingBooking(), status: 'expired', holdsSlot: false });
    Booking.findOneAndUpdate.mockRejectedValue({ code: 11000 });

    const result = await confirmPayment({ gatewayOrderId: 'mock_order_1', gatewayPaymentId: 'mock_payment_1' });

    expect(result.payment.status).toBe('refund_due');
    expect(result.payment.lateArrival).toBe(true);
    expect(Payment.updateOne).toHaveBeenCalledWith(
      { _id: 'payment-id', status: 'paid' },
      { $set: { status: 'refund_due', lateArrival: true } }
    );
  });

  it('does not retry a refund-due payment into a newly free slot', async () => {
    Payment.findOne.mockResolvedValue({ _id: 'payment-id', bookingId, status: 'refund_due', gatewayOrderId: 'mock_order_1' });
    Booking.findById.mockResolvedValue({ ...pendingBooking(), status: 'expired', holdsSlot: false });

    await confirmPayment({ gatewayOrderId: 'mock_order_1', gatewayPaymentId: 'mock_payment_1' });

    expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
  });
});