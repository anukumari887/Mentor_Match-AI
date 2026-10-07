import api from './api';

export async function listMentors(params) {
  const { data } = await api.get('/api/mentors', { params });
  return data;
}

export async function getMentor(id) {
  const { data } = await api.get(`/api/mentors/${id}`);
  return data.mentor;
}

export async function listPendingMentors(params = {}) {
  const { data } = await api.get('/api/admin/mentors', { params: { status: 'pending', ...params } });
  return data;
}

export async function approveMentor(id) {
  const { data } = await api.patch(`/api/admin/mentors/${id}/approve`);
  return data.mentor;
}

export async function rejectMentor(id, reason) {
  const { data } = await api.patch(`/api/admin/mentors/${id}/reject`, { reason });
  return data.mentor;
}

export async function listMentorSlots(id) {
  const { data } = await api.get(`/api/mentors/${id}/slots`);
  return data;
}

export async function createBooking(details) {
  const { data } = await api.post('/api/bookings', details);
  return data.booking;
}

export async function listBookings(params = {}) {
  const { data } = await api.get('/api/bookings', { params });
  return data.bookings;
}

export async function getBooking(id) {
  const { data } = await api.get(`/api/bookings/${id}`);
  return data.booking;
}

export async function cancelBooking(id, reason = '') {
  const { data } = await api.patch(`/api/bookings/${id}/cancel`, { reason });
  return data.booking;
}

export async function downloadBookingIcs(id) {
  const response = await api.get(`/api/bookings/${id}/calendar.ics`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}