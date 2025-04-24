// ===========================================================
// src/integrations/evolution/client.ts
// Axios client para Evolution API v2.2.2
// ===========================================================
import axios, { AxiosInstance } from 'axios';

const baseURL = process.env.EVOLUTION_API_BASE_URL;
const token = process.env.EVOLUTION_API_TOKEN;

if (!baseURL || !token) {
  throw new Error('EVOLUTION_API_BASE_URL e EVOLUTION_API_TOKEN devem estar definidos no .env');
}

class EvolutionClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Envia mensagem de texto via Evolution
   */
  async sendText(instance: string, number: string, text: string, apiKey: string): Promise<any> {
    return this.client.post(`/message/sendText/${instance}`, { number, text });
  }

  /**
   * Verifica assinatura do webhook
   */
  verifySignature(signature: string, payload: string): boolean {
    // Implementar HMAC-SHA256 com token
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', token);
    hmac.update(payload, 'utf8');
    const digest = hmac.digest('hex');
    return digest === signature;
  }
}

export const evolutionClient = new EvolutionClient();
