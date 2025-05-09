import { Server } from 'socket.io';
import { authMiddleware } from './authMiddleware';
import { chatController } from '../controllers/chatController';
import { feedRoom, roomName } from './index';

export function register(io: Server) {
  io.on('connection', (socket) => {
    const { clinicId, userId, nome } = socket.data;
    console.log(`[SOCKET] agente ${userId}:${nome} conectado à clínica ${clinicId}`);

    // —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // Eventos de "conversa"
    // —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    socket.on('feed:join', ack => {
      if (!clinicId) return ack?.({ success: false, error: 'no clinic' });
      socket.join(`clinic:${clinicId}:feed`);
      ack?.({ success: true });
    });
    
    socket.on('conversation:join', async (conversationId: number, ack) => {
      try {
        socket.join(roomName(clinicId, conversationId));
        ack?.({ success: true });

      } catch (err: any) {
        ack({ success: false, error: err.message });
      }
    });
    
    socket.on(
      'conversation:history',
      async ({ conversationId, limit = 40 }, ack) => {
        try {
          const msgs = await chatController.loadHistory({
            clinicId,
            conversationId,
            limit
          });
          ack({ success: true, data: msgs });
        } catch (err: any) {
          ack({ success: false, error: err.message });
        }
      }
    );



    /* agente envia mensagem */
    socket.on('message:send', 
      async (payload: { content: string; conversationId: number }, ack)  => {
      console.log('[SOCKET] ⬅️  message:send', ack); 
      try {
        console.log('[SOCKET] ⬅️  message:send', payload);
        const msg = await chatController.sendMessageFromAgent({
          clinicId,
          ...payload
        });
        console.log('[SOCKET] ➡️  message:send ok', msg.id);
        ack?.({ success: true, msg }); 
      } catch (e: any) {
        console.error('[SOCKET] ❌ erro message:send', e.message); // 👈
        ack?.({ ok: false, error: e.message });
      }
    });

    /* agente marca leitura */
    socket.on('message:read', async ({ conversationId, messageId }) => {
      await chatController.markAsRead({
        clinicId,
        conversationId,
        messageId,
        agentId: userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] agente ${userId} OFF`);
    });
  });
}