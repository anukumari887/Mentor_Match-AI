import api from './api';

export async function createPaymentOrder(bookingId) {
  const { data } = await api.post('/api/payments/create-order', { bookingId });
  return data;
}

export async function confirmMockPayment(bookingId) {
  const { data } = await api.post('/api/payments/mock/confirm', { bookingId });
  return data;
}

export async function verifyRazorpayPayment(result) {
  const { data } = await api.post('/api/payments/verify', result);
  return data;
}

export async function getMentorEarnings() {
  const { data } = await api.get('/api/payments/mentor/earnings');
  return data;
}