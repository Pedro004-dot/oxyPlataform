// backend/src/routes/evolutionWebhook.ts
import express from 'express';
import prisma from '../../prisma/client';
import { parseEvolutionEvent } from '../integrations/evolution/evolParser';
import { chatController } from '../controllers/chatController';

export const evolutionRouter = express.Router();

evolutionRouter.post('/messages-upsert', async (req, res) => {
  try {
    const payload = req.body;

    // 1) Encontrar clínica pela instância/token
    const clinic = await prisma.app_clinica.findUnique({
      where: { tokenEvolution: payload.apikey }
    });
    if (!clinic) return res.status(401).send('API key inválida');

 

    // 2) Normalizar mensagens (pode vir array ou único)
    const msgs = parseEvolutionEvent(payload);

    // 3) Para cada mensagem, garantir que a conversa exista e então processar
    for (const m of msgs) {
      // findOrCreate conversa (privada ou group) → retorna conversationId
      const convId = await chatController.ensureConversation({
        clinicId: clinic.id,
        msg: m
      });

    
      // 4) Persistir e emitir o evento
      await chatController.handleIncoming({
        clinicId: clinic.id,
        conversationId: convId,
        msg: m
      });
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error', err);
    return res.sendStatus(500);
  }
});