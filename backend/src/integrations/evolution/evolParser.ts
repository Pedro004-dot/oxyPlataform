// src/integrations/evolution/evolParser.ts

/**
 * evolParser.ts — Normalizador de payloads da Evolution API
 */

type RawEvolutionPayload = any; // payload bruto do controller

export type MessageContext = 'private' | 'group';
export type MessageKind =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'unknown';

export interface NormalizedMessage {
  /** tokenEvolution da clínica — será injetado pelo controller */
  apiKey: string;

  /** Contexto da mensagem */
  context: MessageContext;

  /** JID do grupo, se for mensagem em grupo */
  groupJid?: string;

  /** JID completo do remetente (ex: 5511999…@s.whatsapp.net) */
  senderJid: string;

  /** Telefone limpo (somente para private) */
  senderPhone: string;

  /** Nome exibido pelo usuário (pushName) */
  pushName?: string;

  /** ID da mensagem na Evolution */
  messageId: string;

  /** Timestamp (epoch em segundos) */
  timestamp: number;

  /** Tipo normalizado de mensagem */
  kind: MessageKind;

  /** Texto da mensagem ou legenda */
  text?: string;

  /** URL original da mídia (download via Evolution) */
  mediaUrl?: string;

  /** MIME type da mídia */
  mimeType?: string;

  /** Nome do arquivo em caso de documento */
  fileName?: string;

  /** Duração em segundos para áudio/vídeo */
  duration?: number;

  /** Payload original para logging/debug */
  raw: any;

  /** Deve criar um novo paciente? (sempre false para grupo) */
  createUser: boolean;
}

export class InvalidPayloadError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidPayloadError';
  }
}

/**
 * Converte um payload bruto da Evolution em um array de mensagens normalizadas.
 */
export function parseEvolutionEvent(
  body: RawEvolutionPayload
): NormalizedMessage[] {
  const events: any[] = Array.isArray(body) ? body : [body];
  const result: NormalizedMessage[] = [];

  for (const ev of events) {
    // apiKey pode vir no root ou em ev.apikey
    const apiKey: string = ev.apikey || body.apikey;
    if (!apiKey) {
      throw new InvalidPayloadError('Campo "apikey" ausente no payload');
    }

    // para payload v2.2.2, dados estão em ev.data
    const data = ev.data;
    if (!data || !data.key) {
      throw new InvalidPayloadError('Campo "data" ou "data.key" ausente');
    }

    const remoteJid: string = data.key.remoteJid;
    const messageId: string = data.key.id;
    if (!remoteJid || !messageId) {
      throw new InvalidPayloadError('remoteJid ou id ausentes em data.key');
    }

    // identificar contexto
    const isGroup = remoteJid.endsWith('@g.us');
    const context: MessageContext = isGroup ? 'group' : 'private';
    const groupJid = isGroup ? remoteJid : undefined;

    // telefone (somente se private)
    const senderPhone = isGroup
      ? ''
      : remoteJid.replace(/\D+/g, '');

    // pushName
    const pushName = data.pushName;

    // timestamp
    const timestamp =
      typeof data.messageTimestamp === 'number'
        ? data.messageTimestamp
        : Math.floor(Date.now() / 1000);

    // determinar tipo e extrair conteúdo
    const kind = detectKind(data);
    const { text, mediaUrl, mimeType, fileName, duration } = extractContent(
      data,
      kind
    );

    result.push({
      apiKey,
      context,
      groupJid,
      senderJid: remoteJid,
      senderPhone,
      pushName,
      messageId,
      timestamp,
      kind,
      text,
      mediaUrl,
      mimeType,
      fileName,
      duration,
      raw: ev,
      createUser: !isGroup
    });
  }

  return result;
}

function detectKind(d: any): MessageKind {
  if (d.message?.conversation) return 'text';
  if (d.message?.audioMessage) return 'audio';
  if (d.message?.imageMessage) return 'image';
  if (d.message?.videoMessage) return 'video';
  if (d.message?.documentMessage) return 'document';
  return 'unknown';
}

function extractContent(
  d: any,
  kind: MessageKind
): {
  text?: string;
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  duration?: number;
} {
  switch (kind) {
    case 'text':
      return { text: d.message.conversation };
    case 'audio':
      return {
        mediaUrl: d.message.audioMessage.url,
        mimeType: d.message.audioMessage.mimetype,
        duration: d.message.audioMessage.seconds
      };
    case 'image':
      return {
        mediaUrl: d.message.imageMessage.url,
        mimeType: d.message.imageMessage.mimetype,
        text: d.message.imageMessage.caption
      };
    case 'video':
      return {
        mediaUrl: d.message.videoMessage.url,
        mimeType: d.message.videoMessage.mimetype,
        text: d.message.videoMessage.caption,
        duration: d.message.videoMessage.seconds
      };
    case 'document':
      return {
        mediaUrl: d.message.documentMessage.url,
        mimeType: d.message.documentMessage.mimetype,
        fileName: d.message.documentMessage.fileName
      };
    default:
      return {};
  }
}