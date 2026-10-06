import api from './api';

export async function submitReview(payload) {
  const { data } = await api.post('/api/reviews', payload);
  return data.review;
}

export async function listMentorReviews(id, params = {}) {
  const { data } = await api.get(`/api/mentors/${id}/reviews`, { params });
  return data;
}