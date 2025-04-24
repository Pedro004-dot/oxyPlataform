import { Socket } from 'socket.io';

export interface UserPayload {
  userId: number;
  email: string;
  nome: string;
  tipo: string;
  clinicaId: number;
}

export interface SocketWithUser extends Socket {
  user: UserPayload;
} 