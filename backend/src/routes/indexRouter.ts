// src/routes/index.ts
import { Router } from 'express';
import authRouter from './authRoutes';
import chatRouter from './chatRoutes';
import { evolutionRouter } from './evolutionWebhook';

const router = Router();

// prefixos opcionais, por exemplo /auth e /chat
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/evolution', evolutionRouter);

// rota de healthcheck, etc.
router.get('/health', (req, res) => res.send({ status: 'ok' }));

export default router;