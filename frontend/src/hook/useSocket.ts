import io from 'socket.io-client'
import { ConversationPreview } from '../types';

/**
 * Events emitted → Server → Client
 */
interface ServerToClientEvents {
  'message:new': (payload: any) => void;
  'message:status': (payload: { id: number; status: string }) => void;
  'conversation:list': (c: ConversationPreview) => void; 
}

/**
 * Events sent → Client → Server
 */
interface ClientToServerEvents {
  'join_conversation': (
    conversationId: number,
    ack: (resp: { success: boolean; error?: string }) => void
  ) => void;
  'feed:join': (ack?: Ack) => void;
  
  'leave_conversation': (conversationId: number) => void;
  'load_history': (
    opts: { conversationId: number; limit: number },
    ack: (resp: { success: boolean; data?: any[]; error?: string }) => void
  ) => void;
  'message:send': (
    opts: { conversationId: number; content: string },
    ack: (resp: { success: boolean; data?: any; error?: string }) => void
  ) => void;
}
interface Ack          { (r: { success: boolean; error?: string }): void }
interface AckWithData<T> { (r: { success: boolean; data?: T; error?: string }): void }

export type ChatSocket = ReturnType<typeof io>;

export function connectSocket(jwt: string): ChatSocket {
  return io(import.meta.env.VITE_WS_URL, {
    transports: ['websocket'],
    auth: { token: jwt }
  }) as ChatSocket;
}