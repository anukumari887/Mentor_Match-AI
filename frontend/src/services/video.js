import { io } from 'socket.io-client';
import api from './api';

export async function getRoomDetails(bookingId) {
  const { data } = await api.get(`/api/bookings/${bookingId}/room`);
  return data;
}

export function connectVideoSocket() {
  return io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
}