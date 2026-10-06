jest.mock('../src/models/Payment', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../src/models/WebhookEvent', () => ({ create: jest.fn() }));
jest.mock('../src/models/Booking', () => ({}));
jest.mock('../src/services/payments/paymentService', () => ({
  createPaymentOrder: jest.fn(),
  confirmPayment: jest.fn()
}));
jest.mock('../src/services/email', () => ({}));
jest.mock('../src/config/env', () => ({ env: {
  NODE_ENV: 'development',
  PAYMENT_MODE: 'razorpay',
  RAZORPAY_KEY_SECRET: 'test-key-secret',
  RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret'
} }));

const crypto = require('node:crypto');
const Payment = require('../src/models/Payment');
const WebhookEvent = require('../src/models/WebhookEvent');
const { confirmPayment } = require('../src/services/payments/paymentService');
const paymentController = require('../src/controllers/payment.controller');

function createResponse() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

function signedWebhook(payload, eventId = 'event-1') {
  const body = Buffer.from(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
  const headers = { 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId };
  return { body, get: (name) => headers[name] };
}

describe('Payment controller signatures and webhook idempotency', () => {
  beforeEach(() => jest.clearAllMocks());

  it('compares signatures without accepting malformed or unequal-length values', () => {
    expect(paymentController.safeSignatureMatch('aabb', 'aabb')).toBe(true);
    expect(paymentController.safeSignatureMatch('aabb', 'aabc')).toBe(false);
    expect(paymentController.safeSignatureMatch('aabb', 'abc')).toBe(false);
    expect(paymentController.safeSignatureMatch('aabb', 'nope')).toBe(false);
  });

  it('rejects a webhook with a bad signature before recording its event', async () => {
    const req = {
      body: Buffer.from('{}'),
      get: (name) => ({ 'x-razorpay-signature': '00'.repeat(32), 'x-razorpay-event-id': 'bad-event' })[name]
    };
    const next = jest.fn();

    await paymentController.razorpayWebhook(req, createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, code: 'INVALID_WEBHOOK_SIGNATURE' }));
    expect(WebhookEvent.create).not.toHaveBeenCalled();
  });

  it('records and processes a valid failed-payment event once', async () => {
    const req = signedWebhook({
      event: 'payment.failed',
      payload: { payment: { entity: { order_id: 'order-1', id: 'payment-1' } } }
    });
    const res = createResponse();
    const next = jest.fn();
    WebhookEvent.create.mockResolvedValue({});

    await paymentController.razorpayWebhook(req, res, next);

    expect(WebhookEvent.create).toHaveBeenCalledWith({ eventId: 'event-1', type: 'payment.failed' });
    expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
      { gatewayOrderId: 'order-1', gateway: 'razorpay', status: 'created' },
      { $set: { status: 'failed', gatewayPaymentId: 'payment-1' } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('confirms a captured Razorpay payment from a valid signed event', async () => {
    WebhookEvent.create.mockResolvedValue({});
    confirmPayment.mockResolvedValue({ payment: { status: 'paid' }, booking: { status: 'confirmed' } });
    const req = signedWebhook({
      event: 'payment.captured',
      payload: { payment: { entity: { order_id: 'order-1', id: 'payment-1' } } }
    });
    const res = createResponse();

    await paymentController.razorpayWebhook(req, res, jest.fn());

    expect(confirmPayment).toHaveBeenCalledWith({ gatewayOrderId: 'order-1', gatewayPaymentId: 'payment-1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns success for a duplicate event without confirming it twice', async () => {
    WebhookEvent.create.mockRejectedValue({ code: 11000 });
    const req = signedWebhook({
      event: 'payment.captured',
      payload: { payment: { entity: { order_id: 'order-1', id: 'payment-1' } } }
    });
    const res = createResponse();

    await paymentController.razorpayWebhook(req, res, jest.fn());

    expect(confirmPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true });
  });

  it('validates Razorpay checkout signatures before confirming payment', async () => {
    const fields = { razorpay_order_id: 'order-1', razorpay_payment_id: 'payment-1' };
    const signature = crypto.createHmac('sha256', 'test-key-secret')
      .update(`${fields.razorpay_order_id}|${fields.razorpay_payment_id}`)
      .digest('hex');
    Payment.findOne.mockResolvedValue({ _id: 'payment-id', gateway: 'razorpay' });
    confirmPayment.mockResolvedValue({ payment: { status: 'paid' }, booking: { status: 'confirmed' } });
    const res = createResponse();
    const next = jest.fn();

    await paymentController.verifyPayment({
      body: { ...fields, razorpay_signature: signature },
      user: { _id: 'learner-id' }
    }, res, next);

    expect(confirmPayment).toHaveBeenCalledWith({ gatewayOrderId: 'order-1', gatewayPaymentId: 'payment-1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});