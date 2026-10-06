const { env } = require('../../config/env');

function getGateway() {
  if (env.PAYMENT_MODE === 'razorpay') return require('./razorpayGateway');
  return require('./mockGateway');
}

module.exports = { getGateway };