// src/controllers/evolutionWebhookController.ts
import { Request, Response } from 'express';
import prisma              from '../../prisma/client';
import { parseEvolutionEvent, InvalidPayloadError } from '../integrations/evolution/evolParser';
import { messageService }     from '../services/messageService';

export async function evolutionWebhookController(req: Request, res: Response) {
  try {
    // 1) Extrai e valida apiKey 
    console.log('[Webhook] payload recebido', req.body);
    const apiKey = req.body.apikey as string;
    if (!apiKey) {
      return res.status(401).send('API key não fornecida');
    }

    // 2) Identifica clínica por tokenEvolution
    const clinica = await prisma.app_clinica.findUnique({
      where: { tokenEvolution: apiKey }
    });
    if (!clinica) {
      return res.status(401).send('API key inválida');
    }
    if (!clinica.instancia) {
      return res.status(400).send('Clínica não possui instância configurada');
    }

    const msgs = parseEvolutionEvent(req.body);

    // 4) Persiste cada mensagem no banco e emite via WebSocket
    await Promise.all(
      msgs.map(msg => {
        // assegura que a instância vem da clínica encontrad
        return messageService.persistAndEmit(msg, apiKey)
      })
    );

    return res.sendStatus(200);

  } catch (err) {
    console.error('Erro no webhook:', err);
    if (err instanceof InvalidPayloadError) {
      return res.status(400).send(err.message);
    }
    return res.sendStatus(500);
  }
}