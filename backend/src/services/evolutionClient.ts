// backend/src/services/evolutionClient.ts
import axios from 'axios';

class EvolutionClient {
  /** Envia texto pelo WhatsApp via Evolution */
  async sendText(
    baseUrl : string,  // ex.: https://evolution-evolution.5epfyr.easypanel.host
    instance: string,  // ex.: oxy
    phone   : string,  // E.164 sem símbolos
    text    : string,
    apiKey  : string,
  ) {
    const url = `${baseUrl}/message/sendText/${instance}`;   // ← path certo
    return axios.post(
      url,
      { number: phone, text },
      {
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      },
    );
  }
}

export const evolutionClient = new EvolutionClient();