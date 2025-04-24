import { Request, Response } from 'express';
import { messageService } from '../services/messageService';

export async function sendMessageController(req: Request, res: Response) {
  const { conversaId, text } = req.body;
  if (!conversaId || !text) {
    return res.status(400).json({ message: 'conversaId e text são obrigatórios' });
  }

  try {
    const result = await messageService.sendMessage(conversaId, text);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ message: 'Falha no envio da mensagem' });
  }
}
