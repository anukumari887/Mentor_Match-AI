const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { getGateway } = require('./gateway');
const { releaseSlotLock, slotLockKey } = require('../../controllers/booking.controller');
const { sendBookingConfirmation } = require('../email');
const logger = require('../../config/logger');
const { paymentsConfirmedTotal } = require('../../utils/metrics');

function calculatePaymentSplit(amount, feePercent = env.PLATFORM_FEE_PERCENT) {
  const platformFee = Math.round(amount * feePercent / 100);
  return { amount, platformFee, mentorEarning: amount - platformFee };
}

function formatOrder(payment) {
  return {
    gateway: payment.gateway,
    orderId: payment.gatewayOrderId,
    amount: payment.amount,
    currency: payment.currency,
    ...(payment.gateway === 'razorpay' ? { keyId: env.RAZORPAY_KEY_ID } : {})
  };
}

async function createPaymentOrder({ bookingId, learnerId }) {
  const booking = await Booking.findOne({ _id: bookingId, learnerId });
  if (!booking) throw new AppError('Booking not found.', 404, 'NOT_FOUND');
  if (booking.status !== 'pending' || !booking.holdsSlot || !booking.expiresAt || booking.expiresAt <= new Date()) {
    throw new AppError('This booking hold has expired or is no longer payable.', 409, 'BOOKING_NOT_PAYABLE');
  }

  let payment = await Payment.findOne({ bookingId });
  if (payment?.status === 'created' && payment.gatewayOrderId) return formatOrder(payment);
  if (payment && !['created', 'failed'].includes(payment.status)) {
    throw new AppError('This booking already has a completed payment.', 409, 'PAYMENT_ALREADY_PROCESSED');
  }

  const amount = Math.round(booking.priceAtBooking * 100);
  const split = calculatePaymentSplit(amount);
  const gateway = getGateway();
  const order = await gateway.createOrder({ amount, currency: 'INR', bookingId });
  const fields = {
    bookingId,
    learnerId,
    mentorId: booking.mentorId,
    ...split,
    currency: 'INR',
    gateway: env.PAYMENT_MODE,
    gatewayOrderId: order.id,
    gatewayPaymentId: '',
    status: 'created',
    lateArrival: false,
    earned: false
  };

  if (payment) {
    payment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['created', 'failed'] } },
      { $set: fields },
      { new: true, runValidators: true }
    );
  } else {
    try {
      payment = await Payment.create(fields);
    } catch (error) {
      if (error.code !== 11000) throw error;
      payment = await Payment.findOne({ bookingId });
      if (payment?.status !== 'created') throw error;
    }
  }

  if (!payment) throw new AppError('Payment order could not be created. Please try again.', 409, 'PAYMENT_ORDER_CONFLICT');
  await Booking.updateOne({ _id: booking._id, status: 'pending' }, { $set: { paymentId: payment._id } });
  return formatOrder(payment);
}

async function updatePaymentForRefund(payment, lateArrival = false) {
  await Payment.updateOne(
    { _id: payment._id, status: 'paid' },
    { $set: { status: 'refund_due', lateArrival } }
  );
  payment.status = 'refund_due';
  payment.lateArrival = lateArrival;
}

async function sendConfirmationEmail(booking) {
  try {
    const populatedBooking = await Booking.findById(booking._id)
      .populate('learnerId', 'name email')
      .populate('mentorId', 'name email')
      .lean();
    await sendBookingConfirmation(populatedBooking || booking);
  } catch (error) {
    logger.warn({ message: error.message }, 'Could not prepare booking confirmation email');
  }
}

async function confirmPayment({ gatewayOrderId, gatewayPaymentId }) {
  let payment = await Payment.findOne({ gatewayOrderId });
  if (!payment) throw new AppError('Payment order not found.', 404, 'PAYMENT_NOT_FOUND');
  if (payment.status === 'created') {
    const paid = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'created' },
      { $set: { status: 'paid', gatewayPaymentId, paidAt: new Date() } },
      { new: true }
    );
    if (paid) payment = paid;
    else payment = await Payment.findById(payment._id);
  }
  if (!payment) throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  if (payment.status === 'refund_due') {
    const refundedBooking = await Booking.findById(payment.bookingId);
    return { payment, booking: refundedBooking };
  }
  if (!['paid', 'refund_due'].includes(payment.status)) {
    throw new AppError('Payment is not awaiting confirmation.', 409, 'PAYMENT_NOT_CONFIRMABLE');
  }

  let booking = await Booking.findById(payment.bookingId);
  if (!booking) {
    if (payment.status === 'paid') await updatePaymentForRefund(payment, true);
    throw new AppError('The booking for this payment was not found.', 404, 'BOOKING_NOT_FOUND');
  }

  let transitioned = false;
  if (booking.status === 'pending') {
    try {
      const confirmed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: 'pending', holdsSlot: true },
        { $set: { status: 'confirmed' } },
        { new: true }
      );
      if (confirmed) {
        booking = confirmed;
        transitioned = true;
      } else {
        booking = await Booking.findById(booking._id);
      }
    } catch (error) {
      if (payment.status === 'paid') await updatePaymentForRefund(payment, true);
      throw error;
    }
  } else if (booking.status === 'expired') {
    try {
      const restored = await Booking.findOneAndUpdate(
        { _id: booking._id, status: 'expired', holdsSlot: false },
        { $set: { status: 'confirmed', holdsSlot: true } },
        { new: true }
      );
      if (restored) {
        booking = restored;
        transitioned = true;
        payment.lateArrival = true;
        await Payment.updateOne({ _id: payment._id }, { $set: { lateArrival: true } });
      } else {
        booking = await Booking.findById(booking._id);
      }
    } catch (error) {
      if (error.code !== 11000) throw error;
      await updatePaymentForRefund(payment, true);
    }
  } else if (booking.status === 'cancelled') {
    await updatePaymentForRefund(payment, true);
  }

  if (booking.status === 'pending') {
    await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'pending' },
      { $set: { status: 'expired', holdsSlot: false } }
    );
    await updatePaymentForRefund(payment, true);
    booking.status = 'expired';
    booking.holdsSlot = false;
  }

  if (transitioned) {
    await releaseSlotLock(slotLockKey(booking.mentorId, booking.startTime), booking._id);
    if (payment.status === 'paid') {
      paymentsConfirmedTotal.inc();
      await sendConfirmationEmail(booking);
    }
  }

  return { payment, booking };
}

module.exports = { calculatePaymentSplit, createPaymentOrder, confirmPayment, formatOrder };