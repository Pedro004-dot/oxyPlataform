export interface ConversationPreview {
    id: number;
    nomePaciente: string;
    ultimaMensagem: string;
    atualizadaEm: string;
  }
  
  export interface ServerToClientEvents {
    /** push quando surge nova conversa ou chega msg que muda a ordem */
    'conversation:list': (conv: ConversationPreview) => void;
    'message:new'      : (msg: any) => void;     // já existe
  }
  
  export interface ClientToServerEvents {
    'conversation:join': (
      id: number,
      ack: (r: { success: boolean; error?: string }) => void
    ) => void;
    // …
  }

  export interface RawMsg {
    id: number;
    conteudo: string;
    criadaEm: string;
    tipo_mensagem: string;
    remetente: string;
    remetente_id: number;
    destinatario: string;
    destinatario_id: number;
    status: string;
    tipo: string;
  }
  // src/types/index.ts
// export interface ConversationPreview {
//   id: number;
//   nome?: string;
//   ultimaMensagem?: string;
//   atualizadaEm: string;
//   naoLidas?: number;
//   tipo: 'individual' | 'group';
//   foto?: string;
// }

// export interface Message {
//   id: number;
//   conversationId: number;
//   content: string;
//   sentAt: string;
//   sender: 'user' | 'agent';
//   senderName?: string;
//   status?: 'sent' | 'delivered' | 'read';
// }