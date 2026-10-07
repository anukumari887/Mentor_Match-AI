import { io } from 'socket.io-client';
import api from './api';

export async function getRoomDetails(bookingId) {
  const { data } = await api.get(`/api/bookings/${bookingId}/room`);
  return data;
}

export function connectVideoSocket() {
  const socketUrl = typeof import.meta.env.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.PROD ? undefined : 'http://localhost:5000');
  return io(socketUrl, { withCredentials: true });
}