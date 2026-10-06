const Razorpay = require('razorpay');
const { env } = require('../../config/env');

const client = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
});

async function createOrder({ amount, currency, bookingId }) {
  return client.orders.create({
    amount,
    currency,
    receipt: String(bookingId).slice(0, 40),
    notes: { bookingId: String(bookingId) }
  });
}

module.exports = { createOrder };