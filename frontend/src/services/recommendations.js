import api from './api';

export async function getRecommendations(limit = 5) {
  const { data } = await api.get('/api/recommendations', { params: { limit } });
  return data;
}