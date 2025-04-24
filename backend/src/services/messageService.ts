import  prisma  from '../../prisma/client';
import { evolutionClient } from '../integrations/evolution/client';
import { emitNewMessage } from './wsGateway';
import { conversationService } from './conversationService';
import { queueProducer } from './queueProducer';
import { NormalizedMessage } from '@/integrations/evolution/evolParser';
import { uploadMediaToSupabase } from './supabaseStorage';
import { processarMidiaEvolution } from './processarMidiaEvolution';


interface EvolutionInboundEvent {
  body?: {
    event: string;
    apikey: string;
    instance: string;
    data: {
      key: {
        remoteJid: string;
        id: string;
      };
      message: {
        conversation?: string;
      };
      messageType: string;
      messageTimestamp: number;
      pushName?: string;
    };
  };
}

const KIND_FOLDER: Record<string,string> = {
  audio:    'audio',
  document: 'documento',
  image:    'imagem',
  video:    'video'
};

const ALLOWED_KINDS = [
  'text','audio','image','video','document','sticker','reaction','system'
];

export const messageService = {
  /**
   * Trata eventos inbound da Evolution API
   */
  async handleInboundEvent(event: EvolutionInboundEvent) {
    const raw = event.body;
    const apiKey = event.body?.apikey;
    if (!apiKey) {
      throw new Error('API key não fornecida no payload');
    }
    
    // Buscar clínica pelo token Evolution
    const clinica = await prisma.app_clinica.findUnique({ 
      where: { tokenEvolution: apiKey } 
    });
    
    if (!clinica) {
      throw new Error(`Clínica não encontrada para o token fornecido`);
    }

    // Se for evento messages.upsert
    if (event.body?.event === 'messages.upsert' && event.body?.data) {
      const data = event.body.data;
      
      // Sanitizar número: remover @s.whatsapp.net
      const phoneRaw = data.key.remoteJid;
      const phone = phoneRaw.split('@')[0];
      
      const content = data.message?.conversation || '';
      const tipo = data.messageType;
      const evolutionId = data.key.id;
      const nome = data.pushName || phone;

      // 1. Encontrar ou criar Paciente
      let paciente = await prisma.app_paciente.findFirst({
        where: { telefone: phone }
      });

      if (!paciente) {
        paciente = await prisma.app_paciente.create({
          data: { 
            nome: nome,
            telefone: phone 
          }
        });
      }

      // 2. Encontrar ou criar Conversa
      const conversa = await conversationService.findOrCreate(paciente.id, clinica.id);

      // 3. Criar Mensagem inbound
      const mensagem = await prisma.app_mensagem.create({
        data: {
          conversa_id: conversa.id,
          remetente: 'paciente',
          conteudo: content,
          tipo_mensagem: tipo,
          evolution_id: evolutionId,
          status: 'RECEIVED',
          criadaEm: new Date()
        }
      });

      // 4. Atualizar timestamp da conversa
      await conversationService.touch(conversa.id);

      // 5. Emitir evento para front via WebSocket
      emitNewMessage(conversa.id, {
        id: mensagem.id,
        conteudo: mensagem.conteudo,
        remetente: mensagem.remetente,
        tipo: mensagem.tipo_mensagem,
        criadaEm: mensagem.criadaEm
      });

      // 6. Publicar na fila
      await queueProducer.publish('inbound_messages', mensagem);
    }
  },
  
  async persistAndEmit(msg: NormalizedMessage, apiKey: string) {
    // 1) Filtrar kinds não suportados
    if (!ALLOWED_KINDS.includes(msg.kind)) {
      console.warn(`Skipping unsupported kind="${msg.kind}" id=${msg.messageId}`);
      return;
    }

    // 2) Buscar clínica pelo tokenEvolution (apiKey)
    const clinica = await prisma.app_clinica.findUnique({
      where: { tokenEvolution: apiKey }
    });
    if (!clinica) {
      throw new Error(`Clínica não encontrada para token ${apiKey}`);
    }

    // 3) Obter/construir conversa (grupo ou privado)
    let conversa;
    if (msg.context === 'group') {
      // 3a) Grupo
      let grupo = await prisma.app_grupo.findUnique({
        where: { jid: msg.groupJid! }
      });
      if (!grupo) {
        grupo = await prisma.app_grupo.create({
          data: { jid: msg.groupJid!, clinica_id: clinica.id }
        });
      }
      conversa = await prisma.app_conversa.findFirst({
        where: { grupo_id: grupo.id, clinica_id: clinica.id }
      }) || await prisma.app_conversa.create({
        data: { grupo_id: grupo.id, clinica_id: clinica.id }
      });
    } else {
      // 3b) Privado
      let paciente = await prisma.app_paciente.findFirst({
        where: { telefone: msg.senderPhone, clinica_id: clinica.id }
      });
      if (!paciente && msg.createUser) {
        paciente = await prisma.app_paciente.create({
          data: {
            nome:       msg.pushName || msg.senderPhone,
            telefone:   msg.senderPhone,
            clinica_id: clinica.id
          }
        });
      }
      if (!paciente) {
        throw new Error(`Paciente ${msg.senderPhone} não encontrado`);
      }
      conversa = await prisma.app_conversa.findFirst({
        where: { paciente_id: paciente.id, clinica_id: clinica.id }
      }) || await prisma.app_conversa.create({
        data: {
          paciente_id: paciente.id,
          clinica_id:  clinica.id
        }
      });
    }

    // 4) Criar app_mensagem
    const mensagem = await prisma.app_mensagem.create({
      data: {
        conversa_id:   conversa.id,
        remetente:     msg.context === 'group' ? msg.senderJid : 'paciente',
        conteudo:      msg.text,
        tipo_mensagem: msg.kind,
        evolution_id:  msg.messageId,
        status:        'RECEIVED',
        criadaEm:      new Date(msg.timestamp * 1000)
      }
    });

    // 5) Se houver mídia, upload para Supabase e grava em app_midia
    if (msg.mediaUrl) {
      // mapeia kind para pasta em PT-BR
      const pasta = KIND_FOLDER[msg.kind] as 'audio' | 'documento' | 'imagem' | 'video';
      // processa download + upload e retorna URL pública
      const publicUrl = await processarMidiaEvolution(msg.mediaUrl, pasta, msg.messageId);
    
      // grava em app_midia
      await prisma.app_midia.create({
        data: {
          mensagem_id: mensagem.id,
          tipo:        msg.kind,
          file_url:    publicUrl,
          mime_type:   msg.mimeType,
          caption:     msg.text,
          duration:    msg.duration
        }
      });
    }
    console.log('[messageService] persistAndEmit', msg);
    // 6) Emitir WebSocket para front
    emitNewMessage(conversa.id, {
      id:           mensagem.id,
      remetente:    mensagem.remetente,
      conteudo:     mensagem.conteudo,
      tipo:         mensagem.tipo_mensagem,
      criadaEm:     mensagem.criadaEm
      // front pode buscar app_midia para URLs de mídia
    });

    console.log('[messageService] mensagem persistida', mensagem);
    // 7) Publicar na fila RabbitMQ (opcional/commented)
    await queueProducer.publish('inbound_messages', mensagem);
  },

  /**
   * Envia mensagem de texto para o cliente via Evolution API
   */
  async sendMessage(conversaId: number, text: string) {
    // 1. Verificar conversa
    const conversa = await prisma.app_conversa.findUnique({ where: { id: conversaId } });
    if (!conversa) throw new Error('Conversa não encontrada');

    // 2. Buscar paciente e clínica
    if (!conversa.paciente_id) throw new Error('Conversa sem paciente associado');
    if (!conversa.clinica_id) throw new Error('Conversa sem clínica associada');

    const paciente = await prisma.app_paciente.findUnique({ where: { id: conversa.paciente_id } });
    const clinica = await prisma.app_clinica.findUnique({ where: { id: conversa.clinica_id } });
    if (!paciente || !clinica) {
      throw new Error('Dados de paciente ou clínica incompletos');
    }

    // Sanitizar número
    const phone = paciente.telefone.replace(/\D+/g, '');
    const instance = clinica.instancia;
    const token = clinica.tokenEvolution ; 

    // 3. Criar mensagem local PENDING
    const pending = await prisma.app_mensagem.create({
      data: {
        conversa_id: conversaId,
        remetente: 'agente',
        conteudo: text,
        tipo_mensagem: 'text',
        status: 'PENDING',
        criadaEm: new Date()
      }
    });

    try {
      // 4. Enviar via Evolution
      if (!instance || !token) throw new Error('Token Evolution não encontrado para a clínica');
      const response = await evolutionClient.sendText(instance, phone, text, token);
      const evolutionMsgId = response.data.messageId || response.data.id;

      // 5. Atualizar mensagem como SENT
      const sent = await prisma.app_mensagem.update({
        where: { id: pending.id },
        data: {
          status: 'SENT',
          evolution_id: evolutionMsgId
        }
      });

      // 6. Emitir evento de nova mensagem para UI
      emitNewMessage(conversaId, {
        id: sent.id,
        conteudo: sent.conteudo,
        remetente: sent.remetente,
        tipo: sent.tipo_mensagem,
        criadaEm: sent.criadaEm
      });

      // 7. Publicar na fila (comentado)
      await queueProducer.publish('outbound_messages', sent);

      return sent;
    } catch (error) {
      console.error('Erro enviando via Evolution:', error);
      // 8. Marcar status como ERROR
      await prisma.app_mensagem.update({
        where: { id: pending.id },
        data: { status: 'ERROR' }
      });
      throw error;
    }
  }
};

