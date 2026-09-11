import { cors } from 'hono/cors';
import { config } from '../config.js';

export const corsMiddleware = cors({
  origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(',').map((s) => s.trim()),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

