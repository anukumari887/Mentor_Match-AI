const crypto = require('node:crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const WebhookEvent = require('../models/WebhookEvent');
const { env } = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');
const { bookingPaymentSchema, razorpayVerificationSchema } = require('../validations/payment.validation');
const { createPaymentOrder, confirmPayment } = require('../services/payments/paymentService');
const { sendBookingCancellation } = require('../services/email');

function safeSignatureMatch(expectedHex, actualHex) {
  if (!/^[a-f\d]+$/i.test(actualHex || '') || actualHex.length !== expectedHex.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'));
}

async function createOrder(req, res, next) {
  try {
    const { bookingId } = bookingPaymentSchema.parse(req.body);
    const order = await createPaymentOrder({ bookingId, learnerId: req.user._id });
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
}

async function verifyPayment(req, res, next) {
  try {
    if (env.PAYMENT_MODE !== 'razorpay' || !env.RAZORPAY_KEY_SECRET) {
      return next(new AppError('Razorpay verification is unavailable.', 404, 'NOT_FOUND'));
    }
    const data = razorpayVerificationSchema.parse(req.body);
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest('hex');
    if (!safeSignatureMatch(expected, data.razorpay_signature)) {
      return next(new AppError('Payment signature is invalid.', 400, 'INVALID_PAYMENT_SIGNATURE'));
    }

    const payment = await Payment.findOne({
      gatewayOrderId: data.razorpay_order_id,
      learnerId: req.user._id,
      gateway: 'razorpay'
    });
    if (!payment) return next(new AppError('Payment order not found.', 404, 'PAYMENT_NOT_FOUND'));

    const result = await confirmPayment({
      gatewayOrderId: data.razorpay_order_id,
      gatewayPaymentId: data.razorpay_payment_id
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function confirmMockPayment(req, res, next) {
  try {
    if (env.NODE_ENV === 'production' || env.PAYMENT_MODE !== 'mock') {
      return next(new AppError('Mock payment confirmation is unavailable.', 404, 'NOT_FOUND'));
    }
    const { bookingId } = bookingPaymentSchema.parse(req.body);
    const payment = await Payment.findOne({ bookingId, learnerId: req.user._id, gateway: 'mock' });
    if (!payment) return next(new AppError('Payment order not found.', 404, 'PAYMENT_NOT_FOUND'));
    const result = await confirmPayment({
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId || `mock_payment_${payment._id}`
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function razorpayWebhook(req, res, next) {
  try {
    if (env.PAYMENT_MODE !== 'razorpay' || !env.RAZORPAY_WEBHOOK_SECRET) {
      return next(new AppError('Razorpay webhooks are unavailable.', 404, 'NOT_FOUND'));
    }
    if (!Buffer.isBuffer(req.body)) return next(new AppError('Webhook body must be raw JSON.', 400, 'INVALID_WEBHOOK_BODY'));
    const signature = req.get('x-razorpay-signature') || '';
    const eventId = req.get('x-razorpay-event-id') || '';
    const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
    if (!safeSignatureMatch(expected, signature)) {
      return next(new AppError('Webhook signature is invalid.', 400, 'INVALID_WEBHOOK_SIGNATURE'));
    }
    if (!eventId) return next(new AppError('Webhook event id is required.', 400, 'MISSING_WEBHOOK_EVENT_ID'));

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return next(new AppError('Webhook body is not valid JSON.', 400, 'INVALID_WEBHOOK_BODY'));
    }

    try {
      await WebhookEvent.create({ eventId, type: event.event || 'unknown' });
    } catch (error) {
      if (error.code === 11000) return res.status(200).json({ received: true, duplicate: true });
      throw error;
    }

    const entity = event.payload?.payment?.entity;
    if (['payment.captured', 'order.paid'].includes(event.event) && entity?.order_id && entity?.id) {
      await confirmPayment({ gatewayOrderId: entity.order_id, gatewayPaymentId: entity.id });
    } else if (event.event === 'payment.failed' && entity?.order_id) {
      await Payment.findOneAndUpdate(
        { gatewayOrderId: entity.order_id, gateway: 'razorpay', status: 'created' },
        { $set: { status: 'failed', gatewayPaymentId: entity.id || '' } }
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ message: error.message }, 'Razorpay webhook processing failed');
    return next(error);
  }
}

async function getMentorEarnings(req, res, next) {
  try {
    const [summary] = await Payment.aggregate([
      { $match: { mentorId: req.user._id, status: 'paid', earned: true } },
      { $group: { _id: '$mentorId', earned: { $sum: '$mentorEarning' } } }
    ]);
    const [payoutSummary] = await Payout.aggregate([
      { $match: { mentorId: req.user._id } },
      { $group: { _id: '$mentorId', paidOut: { $sum: '$amount' } } }
    ]);
    const recent = await Payment.find({ mentorId: req.user._id, status: 'paid' })
      .sort({ paidAt: -1 })
      .limit(20)
      .populate('bookingId', 'startTime priceAtBooking')
      .lean();
    const earned = summary?.earned || 0;
    const paidOut = payoutSummary?.paidOut || 0;
    const balance = Math.max(0, earned - paidOut);
    return res.status(200).json({ earned, paidOut, balance, recent });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  confirmMockPayment,
  razorpayWebhook,
  getMentorEarnings,
  safeSignatureMatch
};