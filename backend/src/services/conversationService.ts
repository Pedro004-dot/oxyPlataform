// src/services/conversationService.ts
// Lógica para encontrar ou criar conversas
import  prisma  from '../../prisma/client';

export const conversationService = {
  /**
   * Busca a conversa pela combinação paciente_id e clinica_id,
   * ou cria uma nova se não existir.
   */
  async findOrCreate(pacienteId: number, clinicaId?: number) {
    let conversa = await prisma.app_conversa.findFirst({
      where: { paciente_id: pacienteId, clinica_id: clinicaId }
    });
    if (!conversa) {
      conversa = await prisma.app_conversa.create({
        data: {
          paciente_id: pacienteId,
          clinica_id: clinicaId,
          iniciada_em: new Date(),
          atualizada_em: new Date()
        }
      });
    }
    return conversa;
  },

  /**
   * Atualiza apenas o timestamp de "atualizada_em" da conversa.
   */
  async touch(conversaId: number) {
    return prisma.app_conversa.update({
      where: { id: conversaId },
      data: { atualizada_em: new Date() }
    });
  }
};