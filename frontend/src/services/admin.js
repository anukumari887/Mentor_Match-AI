import api from './api';

export async function getAdminStats() {
  const response = await api.get('/admin/stats');
  return response.data;
}

export async function getAdminUsers(params = {}) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(id, isActive) {
  const response = await api.patch(`/admin/users/${id}`, { isActive });
  return response.data;
}

export async function getAdminBookings(params = {}) {
  const response = await api.get('/admin/bookings', { params });
  return response.data;
}

export async function getAdminPayments(params = {}) {
  const response = await api.get('/admin/payments', { params });
  return response.data;
}

export async function markPaymentRefunded(id, refundReference) {
  const response = await api.patch(`/admin/payments/${id}/mark-refunded`, { refundReference });
  return response.data;
}

export async function getPayoutsSummary() {
  const response = await api.get('/admin/payouts-summary');
  return response.data;
}

export async function recordPayout(data) {
  const response = await api.post('/admin/payouts', data);
  return response.data;
}

export async function getAdminPayouts() {
  const response = await api.get('/admin/payouts');
  return response.data;
}

export async function getAdminComplaints(params = {}) {
  const response = await api.get('/admin/complaints', { params });
  return response.data;
}

export async function resolveComplaint(id, resolutionNote) {
  const response = await api.patch(`/admin/complaints/${id}`, { resolutionNote });
  return response.data;
}

export async function submitComplaint(data) {
  const response = await api.post('/complaints', data);
  return response.data;
}
