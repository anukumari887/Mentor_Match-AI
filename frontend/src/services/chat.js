import api from './api';

export async function getChatAccess(mentorId) {
  const { data } = await api.get('/api/chats/access', { params: { mentorId } });
  return data;
}

export async function createConversation(mentorId) {
  const { data } = await api.post('/api/chats', { mentorId });
  return data.conversation || data;
}

export async function listConversations() {
  const { data } = await api.get('/api/chats');
  return Array.isArray(data) ? data : data?.conversations || [];
}

export async function getUnreadCount() {
  const { data } = await api.get('/api/chats/unread-count');
  return typeof data?.unreadCount === 'number' ? data.unreadCount : (typeof data === 'number' ? data : 0);
}

export async function listMessages(conversationId, { before, limit = 30 } = {}) {
  const params = {};
  if (before) params.before = before;
  if (limit) params.limit = limit;
  const { data } = await api.get(`/api/chats/${conversationId}/messages`, { params });
  return data;
}

export async function sendMessage(conversationId, { body, clientMessageId }) {
  const { data } = await api.post(`/api/chats/${conversationId}/messages`, { body, clientMessageId });
  return data?.message || data;
}

export async function markChatRead(conversationId) {
  const { data } = await api.post(`/api/chats/${conversationId}/read`);
  return data;
}
