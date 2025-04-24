import io from 'socket.io-client'

/**
 * Events emitted → Server → Client
 */
interface ServerToClientEvents {
  'message:new': (payload: any) => void;
  'message:status': (payload: { id: number; status: string }) => void;
}

/**
 * Events sent → Client → Server
 */
interface ClientToServerEvents {
  'join_conversation': (
    conversationId: number,
    ack: (resp: { success: boolean; error?: string }) => void
  ) => void;
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

export type ChatSocket = ReturnType<typeof io>;

export function connectSocket(jwt: string): ChatSocket {
  const url = (import.meta.env.VITE_WS_URL as string) || '';
  return io(url, {
    transports: ['websocket'],
    auth: { token: jwt },
  });
}