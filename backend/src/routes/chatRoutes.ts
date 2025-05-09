// src/routes/chat.routes.ts
import { Router } from 'express';

import  authMiddleware  from '../middlewares/auth.middleware';
import prisma from '../../prisma/client';
import { AppError } from '../middlewares/errorHandler';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware';
import { chatController } from '../controllers/chatController';

const chatRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Listar conversas
// backend/src/routes/chat.ts
chatRouter.get('/conversas', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Token não fornecido');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      throw new AppError(401, 'Token mal formatado');
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      throw new AppError(401, 'Token mal formatado');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        email: string;
        clinicaId: number;
      };

      req.user = decoded;
    } catch (err) {
      throw new AppError(401, 'Token inválido');
    }

    const conversas = await prisma.app_conversa.findMany({
      where : { clinica_id: req.user?.clinicaId },
      orderBy: { atualizada_em: 'desc' },
      take  : 50,
      select: {
        id           : true,
        atualizada_em: true,
        app_paciente : { select: { nome: true } },
        app_grupo    : { select: { jid: true } },
        app_mensagem : {
          orderBy: { criadaEm: 'desc' },
          take   : 1,
          select : {
            conteudo      : true,
            tipo_mensagem : true,
            criadaEm      : true
          }
        }
      }
    });

    console.log('Conversas encontradas:', conversas); // Log para verificar as conversas e mensagens

    const response = conversas.map(c => {
      const last = c.app_mensagem[0];

      const preview =
        last?.conteudo?.trim()
          || (last?.tipo_mensagem === 'image'    && '📷 imagem')
          || (last?.tipo_mensagem === 'video'    && '🎞️ vídeo')
          || (last?.tipo_mensagem === 'audio'    && '🎤 áudio')
          || (last?.tipo_mensagem === 'document' && '📄 documento')
          || '';

      return {
        id            : c.id,
        nomePaciente  : c.app_paciente?.nome       || c.app_grupo?.jid || 'Desconhecido',
        ultimaMensagem: preview,
        atualizadaEm  : (last?.criadaEm ?? c.atualizada_em)?.toISOString()
      };
    });

    console.log('Resposta formatada para o frontend:', response); // Log da resposta formatada
    res.json(response);
  } catch (err) {
    console.error('[API] Erro ao listar conversas:', err);
    res.status(500).json({ message: 'Falha ao listar conversas' });
  }
});
// backend/src/routes/chat.ts
chatRouter.get(
  '/conversas/:id/mensagens',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      // O token já contém o ID da clínica
      const clinicId = req.user?.clinicaId;
      if (!clinicId) {
        return res.status(403).json({ message: 'Clínica não associada ao usuário' });
      }
      
      const conversationId = Number(req.params.id);

      const { items, hasMore } = await chatController.loadHistory({
        clinicId,
        conversationId,
        limit: 40,
        before: req.query.before ? new Date(req.query.before as string) : undefined
      });
      
      res.json({ items, hasMore });
      
    } catch (e) {
      console.error('[API] erro ao carregar histórico', e);
      res.status(500).json({ message: 'Falha ao carregar histórico' });
    }
  }
);

export default chatRouter;