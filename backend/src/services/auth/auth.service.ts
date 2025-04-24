import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../config/logger';
import { AppError } from '../../middlewares/errorHandler';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

type JwtPayload = {
  userId:   number;
  email:    string;
  nome:     string;
  clinicaId: number;
};
export class AuthService {
  static async register( email: string,
    senha: string,
    clinicaId: number,
    ) {
    try {
      // Verifica se o usuário já existe
      const existingUser = await prisma.app_usuario.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError(409, 'Usuário já existe');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);

      // Cria o usuário
      const user = await prisma.app_usuario.create({
        data: {
          email,
          senha: hashedPassword,
          nome: email.split('@')[0], 
          clinica_id: clinicaId,
        },
      });

      return user;
    } catch (error) {
      logger.error('Erro no registro:', error);
      throw error;
    }
  }

  static async login(email: string, senha: string) {
    try {
      // Busca o usuário
      const user = await prisma.app_usuario.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          nome: true,
          clinica_id: true,
          senha: true,
        },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verifica a senha
      const isValidPassword = await bcrypt.compare(senha, user.senha);
      if (!isValidPassword) {
        throw new Error('Senha inválida');
      }

      // Gera o token JWT
      const payload: JwtPayload = {
        userId:   user.id,
        email:    user.email,
        nome:     user.nome,       
        clinicaId: user.clinica_id!,
      };
  
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      return {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
        },
      };
    } catch (error) {
      logger.error('Erro no login:', error);
      throw error;
    }
  }

  static async forgotPassword(email: string) {
    try {
      const user = await prisma.app_usuario.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // TODO: Implementar envio de email
      logger.info(`Solicitação de recuperação de senha para: ${email}`);
      
      return { message: 'Email de recuperação enviado' };
    } catch (error) {
      logger.error('Erro na recuperação de senha:', error);
      throw error;
    }
  }
} 