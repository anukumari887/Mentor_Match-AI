import { io } from 'socket.io-client';

let sharedSocket = null;

export function getChatSocket() {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
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
