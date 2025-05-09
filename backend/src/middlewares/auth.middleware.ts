import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    clinicaId: number;
  };
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'Token não fornecido');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      throw new AppError(401, 'Token mal formatado');
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      throw new AppError(401, 'Token mal formatado');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        email: string;
        clinicaId: number;
      };

      req.user = decoded;
      return next();
    } catch (error) {
      throw new AppError(401, 'Token inválido');
    }
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logger.error('Erro na autenticação:', error);
    return next(new AppError(500, 'Erro interno do servidor'));
  }
}; 
export default authMiddleware;