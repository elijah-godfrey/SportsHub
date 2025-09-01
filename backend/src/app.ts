import fastify from 'fastify';
import { healthRoutes } from './routes/health.js';

export const app = fastify({
  logger: true,
});

// Register CORS
app.register(import('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
});

// Register routes
app.register(healthRoutes, { prefix: '/api' });

// Root route
app.get('/', async () => {
  return { message: 'SportsHub API is running! 🏈⚽🏀' };
});

