import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../lib/jwt';

interface SocketWithUser extends Socket {
  user?: {
    userId: number;
    email: string;
    nome: string;
    tipo: string;
  };
}

interface JoinConversationPayload {
  conversationId: number;
}

interface SendMessagePayload {
  conversationId: number;
  content: string;
}

interface LoadHistoryPayload {
  conversationId: number;
  page?: number;
  limit?: number;
}

interface CallbackResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

const prisma = new PrismaClient();

// Singleton instance
let wsGatewayInstance: WebSocketGateway | null = null;

export function initWebSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });
  wsGatewayInstance = new WebSocketGateway(io);
  return wsGatewayInstance;
}

export function emitNewMessage(conversationId: number, message: any) {
  if (!wsGatewayInstance) {
    console.warn('WebSocket Gateway not initialized');
    return;
  }
  wsGatewayInstance.emitNewMessage(conversationId, message);
}

export class WebSocketGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupAuthMiddleware();
    this.setupEventHandlers();
  }

  private getConversationRoom(conversationId: number): string {
    return `conversation_${conversationId}`;
  }

  private setupAuthMiddleware() {
    this.io.use(async (socket: SocketWithUser, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('No token provided');
        }

        // Verify token and attach user to socket
        const user = await verifyToken(token);
        socket.user = {
          userId: user.userId,
          email: user.email,
          nome: user.nome,
          tipo: user.tipo
        };
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: SocketWithUser) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join_conversation', async (payload: JoinConversationPayload, callback: (response: CallbackResponse) => void) => {
        try {
          const conversation = await prisma.app_conversa.findUnique({
            where: { id: payload.conversationId },
            include: { app_paciente: true }
          });

          if (!conversation) {
            return callback({ success: false, error: 'Conversation not found' });
          }

          const room = this.getConversationRoom(payload.conversationId);
          await socket.join(String(room));
          callback({ success: true });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to join conversation';
          callback({ success: false, error: errorMessage });
        }
      });

      socket.on('load_history', async (payload: LoadHistoryPayload, callback: (response: CallbackResponse) => void) => {
        try {
          const page = payload.page || 1;
          const limit = payload.limit || 20;
          const skip = (page - 1) * limit;

          const messages = await prisma.app_mensagem.findMany({
            where: { conversa_id: payload.conversationId },
            orderBy: { criadaEm: 'desc' },
            skip,
            take: limit
          });

          callback({ success: true, data: messages });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load message history';
          callback({ success: false, error: errorMessage });
        }
      });

      socket.on('send_message', async (payload: SendMessagePayload, callback: (response: CallbackResponse) => void) => {
        try {
          const conversation = await prisma.app_conversa.findUnique({
            where: { id: payload.conversationId },
            include: { app_paciente: true }
          });

          if (!conversation) {
            return callback({ success: false, error: 'Conversation not found' });
          }

          const message = await prisma.app_mensagem.create({
            data: {
              conteudo: payload.content,
              conversa_id: payload.conversationId,
              remetente: 'agente',
              tipo_mensagem: 'text',
              criadaEm: new Date()
            }
          });

          const room = this.getConversationRoom(payload.conversationId);
          this.io.to(String(room)).emit('new_message', message);
          callback({ success: true, data: message });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          callback({ success: false, error: errorMessage });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public emitNewMessage(conversationId: number, message: any) {
    if (!this.io) {
      console.warn('WebSocket Gateway not initialized');
      return;
    }
    const room = this.getConversationRoom(conversationId);
    
    // Payload padronizado para o front
    const payload = {
      ...message,
      conversaId: conversationId      // ✅ garante o campo que o React espera
    };

    // 1) Quem já está na conversa (chat aberto)
    this.io.to(room).emit('new_message', payload);

    // 2) Todos os sockets (lista de conversas, badges, etc.)
    this.io.emit('new_message', payload);
  }
}