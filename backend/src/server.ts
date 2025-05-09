import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { initializeRedis } from './services/cache';
import { initializePrisma } from '../prisma/client';
import authRoutes from './routes/authRoutes';
import routes from './routes/indexRouter';
import { initWebSocket } from './services/wsGateway';
import authMiddleware from '../src/middlewares/auth.middleware';
import { createServer } from 'http';
import http from 'http';
import { initSocket } from './socket';
config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'https://ee2f-189-125-25-10.ngrok-free.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
app.use(morgan('dev'));
app.use('/uploads', express.static('public/uploads'));

// Initialize services
initializeRedis();
const prisma = initializePrisma();

// Routes
app.use(routes);

// Error handling
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);           // <<<<< inicia socket

httpServer.listen(3000, () => console.log('API + WS on :3000'));

export default httpServer; 