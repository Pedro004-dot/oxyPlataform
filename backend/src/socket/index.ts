import { Server } from 'socket.io';
import { authMiddleware } from './authMiddleware';
import { register } from './handlers'; 
let io: Server;

export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    path : '/socket.io',
    cors : { origin: process.env.FRONTEND_URL, methods: ['GET','POST'] }
  });
  io.use(authMiddleware);
  register(io);
  require('./handlers').register(io);   // lazy-load handlers
  console.log('✅  Socket.IO ready');
  return io;
}

export function getIo() {
  if (!io) throw new Error('Socket.io não inicializado');
  return io;
}
export function feedRoom(clinicId: number) {
  return `clinic:${clinicId}:feed`;
}

export function roomName(clinicId: number, conversationId: number) {
  return `clinic:${clinicId}:conv:${conversationId}`;
}

export const emitNewMessage = (
  clinicId: number,
  conversationId: number,
  payload: any
) => {
  io?.to(roomName(clinicId, conversationId)).emit('message:new', payload);
};