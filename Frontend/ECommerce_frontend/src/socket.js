import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const connectVendorSocket = (token) =>
  io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
