import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../config/logger';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha, clinicaId } = req.body;

      if (!email || !senha) {
        throw new AppError(400, 'Email e senha são obrigatórios');
      }

      const user = await AuthService.register(email, senha, clinicaId);

      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error('Erro no registro:', error);
      return next(new AppError(500, 'Erro interno do servidor'));
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        throw new AppError(400, 'Email e senha são obrigatórios');
      }

      const result = await AuthService.login(email, senha);

      return res.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error('Erro no login:', error);
      return next(new AppError(500, 'Erro interno do servidor'));
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError(400, 'Email é obrigatório');
      }

      const result = await AuthService.forgotPassword(email);

      return res.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logger.error('Erro na recuperação de senha:', error);
      return next(new AppError(500, 'Erro interno do servidor'));
    }
  }
} 