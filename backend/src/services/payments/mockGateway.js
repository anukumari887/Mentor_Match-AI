const { randomUUID } = require('node:crypto');

async function createOrder({ amount, currency, bookingId }) {
  return {
    id: `mock_order_${randomUUID()}`,
    amount,
    currency,
    receipt: String(bookingId).slice(0, 40)
  };
}

module.exports = { createOrder };