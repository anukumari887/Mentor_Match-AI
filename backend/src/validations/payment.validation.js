const { z } = require('zod');

const bookingPaymentSchema = z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booking id.')
}).strict();

const razorpayVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i)
}).strict();

module.exports = { bookingPaymentSchema, razorpayVerificationSchema };