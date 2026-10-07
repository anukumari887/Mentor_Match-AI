import { io } from 'socket.io-client';

let sharedSocket = null;

export function getChatSocket() {
  if (!sharedSocket || sharedSocket.disconnected) {
    const socketUrl = typeof import.meta.env.VITE_API_URL === 'string'
      ? import.meta.env.VITE_API_URL
      : (import.meta.env.PROD ? undefined : 'http://localhost:5000');
    sharedSocket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
  }
  return sharedSocket;
}

export function disconnectChatSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}
