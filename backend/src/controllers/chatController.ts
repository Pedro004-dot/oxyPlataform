// backend/src/controllers/chatController.ts
import prisma from '../../prisma/client';
import { evolutionClient } from '../services/evolutionClient';
import { feedRoom, getIo, roomName } from '../socket';
import { NormalizedMessage } from '../integrations/evolution/evolParser';

// --- Tipos e constantes para validação de tipos de mensagem ---
export type MessageKind =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'

const ALLOWED_KINDS: readonly MessageKind[] = [
  'text',
  'audio',
  'image',
  'video',
  'document'
];

/**
 * Detecta o tipo de mensagem a partir do payload bruto da Evolution.
 * Retorna null se não reconhecer nenhum tipo.
 */
function detectKind(d: any): MessageKind | null {
  if (d.message?.conversation)      return 'text';
  if (d.message?.audioMessage)      return 'audio';
  if (d.message?.imageMessage)      return 'image';
  if (d.message?.videoMessage)      return 'video';
  if (d.message?.documentMessage)   return 'document';
  return 'text';
}

export const chatController = {
  /**
   * Garante que a conversa exista (grupo ou privado) e retorna o ID
   */
  async ensureConversation({ clinicId, msg }: { clinicId: number; msg: NormalizedMessage }) {
    if (msg.context === 'group') {
      // upsert de grupo
      const grupo = await prisma.app_grupo.upsert({
        where: { jid: msg.groupJid! },
        update: {},
        create: { jid: msg.groupJid!, clinica_id: clinicId }
      });

      // find or create conversa de grupo
      let conv = await prisma.app_conversa.findFirst({
        where: { grupo_id: grupo.id, clinica_id: clinicId }
      });
      if (!conv) {
        conv = await prisma.app_conversa.create({ data: { grupo_id: grupo.id, clinica_id: clinicId } });
      }
      return conv.id;
    } else {
      // upsert de paciente
      const paciente = await prisma.app_paciente.upsert({
        where: { telefone_clinica_id: { telefone: msg.senderPhone, clinica_id: clinicId } },
        update: {},
        create: { nome: msg.pushName || msg.senderPhone, telefone: msg.senderPhone, clinica_id: clinicId }
      });

      // find or create conversa privada
      let conv = await prisma.app_conversa.findFirst({
        where: { paciente_id: paciente.id, clinica_id: clinicId }
      });
      if (!conv) {
        conv = await prisma.app_conversa.create({ data: { paciente_id: paciente.id, clinica_id: clinicId } });
      }
      return conv.id;
    }
  },

  /**
   * Persiste mensagem inbound da Evolution e emite evento 'message:new'
   */
  async handleIncoming({ clinicId, conversationId, msg }: {
    clinicId: number;
    conversationId: number;
    msg: NormalizedMessage;
  }) {
    // valida o MessageKind
    // se veio sem tipo ou tipo não suportado, tentar detectar no raw
    let kind = msg.kind as MessageKind | undefined;
    if (!kind || !ALLOWED_KINDS.includes(kind)) {
      const rawKind = detectKind(msg.raw);
      if (rawKind && ALLOWED_KINDS.includes(rawKind)) {
        kind = rawKind;
      } else {
        console.warn(`skip unsupported kind=\${msg.kind} id=\${msg.messageId}`);
        return;
      }
    }

    const saved = await prisma.app_mensagem.create({ data: {
      conversa_id:   conversationId,
      remetente:     msg.context === 'group' ? msg.senderJid : 'paciente',
      conteudo:      msg.text,
      tipo_mensagem: kind,
      evolution_id:  msg.messageId,
      status:        'RECEIVED',
      criadaEm:      new Date(msg.timestamp * 1000)
    }});

    // emite novo evento de mensagem
    getIo()
      .to(roomName(clinicId, conversationId))
      .emit('message:new', saved);
    

      const conv = await prisma.app_conversa.findUnique({
        where : { id: conversationId },
        select: {
          id          : true,
          atualizada_em: true,
          app_paciente: { select: { nome: true }},
          app_grupo   : { select: { jid: true }}
        }
      });
      
    const preview = {
      id           : conversationId,
      nomePaciente : conv?.app_paciente?.nome ?? conv?.app_grupo?.jid ?? 'Desconhecido',
      ultimaMensagem: saved.conteudo ?? `[${saved.tipo_mensagem}]`,
      atualizadaEm : saved.criadaEm
    };

    getIo()
    .to(feedRoom(clinicId))
    .emit('conversation:list', preview);

    return saved;
  },

  /**
   * Envia mensagem de agente para WhatsApp via Evolution, persiste e emite 'message:new'
   */
  async sendMessageFromAgent({ clinicId, conversationId, content }: {
    clinicId: number;
    conversationId: number;
    content: string;
  }) {
    // busca dados de conversa e paciente
    const conv = await prisma.app_conversa.findUnique({
      where: { id: conversationId },
      include: { app_paciente: true }
    });
    if (!conv?.app_paciente) throw new Error('Conversa ou paciente não encontrado');

    const phone = conv.app_paciente.telefone.replace(/\D+/g, '');
    const clinic = await prisma.app_clinica.findUnique({ where: { id: clinicId } });
    if (!clinic?.instancia || !clinic.tokenEvolution || !clinic.base_url) throw new Error('Configuração Evolution faltando');
    console.log('[EVOLUTION] enviando', { baseUrl: clinic.base_url, instance: clinic.instancia, phone });
    // envia para Evolution
    await evolutionClient.sendText(clinic.base_url,clinic.instancia, phone, content, clinic.tokenEvolution);

    // persiste local
    const saved = await prisma.app_mensagem.create({ data: {
      conversa_id:   conversationId,
      remetente:     'agente',
      conteudo:      content,
      tipo_mensagem: 'text',
      status:        'SENT',
      criadaEm:      new Date()
    }});

    // emite evento de nova mensagem
    getIo()
      .to(roomName(clinicId, conversationId))
      .emit('message:new', saved);
    return saved;
  },

  /**
   * Marca mensagem como lida e emite 'message:status'
   */
  async markAsRead({ clinicId, conversationId, messageId, agentId }: {
    clinicId: number;
    conversationId: number;
    messageId: number;
    agentId: number;
  }) {
    const updated = await prisma.app_mensagem.update({
      where: { id: messageId },
      data: { status: 'READ' }
    });
    // emite atualização de status da mensagem
    getIo()
      .to(roomName(clinicId, conversationId))
      .emit('message:status', { id: messageId, status: updated.status });

    return updated;
  },

  /**
   * Carrega o histórico de mensagens de uma conversa
   */
  async loadHistory({
    clinicId,
    conversationId,
    limit = 40,
    before
  }: {
    clinicId: number;
    conversationId: number;
    limit?: number;
    before?: Date;
  }) {
    // Verifica se a conversa pertence à clínica
    const conversation = await prisma.app_conversa.findFirst({
      where: {
        id: conversationId,
        clinica_id: clinicId
      }
    });
  
    if (!conversation) {
      throw new Error('Conversa não encontrada ou não pertence à clínica');
    }
  
    // Filtro de data (caso seja paginação)
    const whereClause: any = {
      conversa_id: conversationId
    };
    if (before) {
      whereClause.criadaEm = { lt: before };
    }
  
    // Busca as mensagens mais recentes primeiro
    const messages = await prisma.app_mensagem.findMany({
      where: whereClause,
      orderBy: {
        criadaEm: 'desc'
      },
      take: limit
    });
  
    return {
      items: messages,
      hasMore: messages.length === limit
    };
  }
};