import api from './api';

export async function getAdminStats() {
  const response = await api.get('/api/admin/stats');
  return response.data;
}

export async function getAdminUsers(params = {}) {
  const response = await api.get('/api/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(id, isActive) {
  const response = await api.patch(`/api/admin/users/${id}`, { isActive });
  return response.data;
}

export async function getAdminBookings(params = {}) {
  const response = await api.get('/api/admin/bookings', { params });
  return response.data;
}

export async function getAdminPayments(params = {}) {
  const response = await api.get('/api/admin/payments', { params });
  return response.data;
}

export async function markPaymentRefunded(id, refundReference) {
  const response = await api.patch(`/api/admin/payments/${id}/mark-refunded`, { refundReference });
  return response.data;
}

export async function getPayoutsSummary() {
  const response = await api.get('/api/admin/payouts-summary');
  return response.data;
}

export async function recordPayout(data) {
  const response = await api.post('/api/admin/payouts', data);
  return response.data;
}

export async function getAdminPayouts() {
  const response = await api.get('/api/admin/payouts');
  return response.data;
}

export async function getAdminComplaints(params = {}) {
  const response = await api.get('/api/admin/complaints', { params });
  return response.data;
}

export async function resolveComplaint(id, resolutionNote) {
  const response = await api.patch(`/api/admin/complaints/${id}`, { resolutionNote });
  return response.data;
}

export async function submitComplaint(data) {
  const response = await api.post('/api/complaints', data);
  return response.data;
}
