// api/chat.ts
import axios from 'axios';
import { ConversationPreview, RawMsg } from '../types';

const API = import.meta.env.VITE_API_URL;

export async function fetchConversations(jwt: string): Promise<ConversationPreview[]> {
  if (!API) throw new Error('VITE_API_URL não configurado');

  try {
    console.log('Iniciando requisição para carregar conversas...');
    const response = await axios.get(`${API}/chat/conversas`, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
      }
    });
    console.log('Resposta recebida de conversas:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Erro na requisição:', error.response?.data || error.message);
      throw new Error(`Falha ao carregar conversas: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

// src/api/chat.ts
export async function fetchHistory(jwt: string, conversationId: number) {
  const url = `${API}/chat/conversas/${conversationId}/mensagens`;
  const res = await axios.get(url, {
    headers: { 
      Authorization: `Bearer ${jwt}`,
      'ngrok-skip-browser-warning': 'true'
      
    }
  });
  if (!Array.isArray(res.data)) {
    console.error('Formato inesperado em fetchHistory:', res.data);
    throw new Error('Histórico não retornou array de mensagens');
  }
  
  return res.data;
}