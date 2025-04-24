// backend/src/socket/authMiddleware.ts
import { Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt';
import prisma from '../../prisma/client';

export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
) {
  try {
    /* 1. token no handshake ------------------------------------ */
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No token provided'));

    /* 2. decodifica JWT ---------------------------------------- */
    const decoded = await verifyToken(token);
    // decoded = { userId, email, nome, clinicId, iat, exp }

    /* 3. confirma usuário no banco (opcional, mas seguro) ------- */
    const dbUser = await prisma.app_usuario.findUnique({
      where: { id: decoded.userId },
      select: { clinica_id: true },
    });
    if (!dbUser) return next(new Error('User not found'));

    /* 4. anexa ao socket --------------------------------------- */
    socket.data = {
      userId: decoded.userId,
      email:  decoded.email,
      nome:   decoded.nome,
      tipo:   'agente',          // defina fixo ou acrescente ao token
      clinicId: dbUser.clinica_id,
    };

    return next();
  } catch {
    return next(new Error('Invalid authentication token'));
  }
}