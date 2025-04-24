// src/routes/chat.routes.ts
import { Router } from 'express';
import { sendMessageController } from '../controllers/messageController';
import { evolutionWebhookController } from '../controllers/evolutionWebhookController';
import  authMiddleware  from '../middlewares/auth.middleware';
import prisma from '../../prisma/client';

const chatRouter = Router();

// Webhook público da Evolution API
chatRouter.post(
  '/messages-upsert',
  // não precisa de auth, mas validaremos assinatura dentro do controller
  evolutionWebhookController
);

// Envio de mensagem via CRM (apenas usuários autenticados)
chatRouter.post(
  '/messages',
  authMiddleware,
  sendMessageController
);

// Listar conversas
chatRouter.get(
  '/conversas',
  authMiddleware,
  async (req, res) => {
    try {
      const conversas = await prisma.app_conversa.findMany({
        include: {
          app_paciente: true,
          app_mensagem: {
            orderBy: { criadaEm: 'desc' },
            take: 1
          }
        },
        orderBy: { atualizada_em: 'desc' },
        take: 30
      });

      const response = conversas.map(c => ({
        id: c.id,
        nomePaciente: c.app_paciente?.nome || 'Desconhecido',
        ultimaMensagem: c.app_mensagem[0]?.conteudo || '',
        atualizadaEm: c.atualizada_em?.toISOString() || new Date().toISOString()
      }));

      res.json(response);
    } catch (err) {
      console.error('[API] Erro ao listar conversas:', err);
      res.status(500).json({ message: 'Falha ao listar conversas' });
    }
  }
);

export default chatRouter;