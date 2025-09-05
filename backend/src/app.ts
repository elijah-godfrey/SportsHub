import fastify from 'fastify';
import { healthRoutes } from './routes/health.js';
import authPlugin from './middleware/auth.js';

export const app = fastify({
  logger: true,
});

// Register CORS
app.register(import('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
});

// Register auth middleware
app.register(authPlugin);

// Register routes
app.register(healthRoutes, { prefix: '/api' });

// Root route
app.get('/', async () => {
  return { message: 'SportsHub API is running! 🏈⚽🏀' };
});

