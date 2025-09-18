import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { gameRoutes } from './routes/games.js';
import authPlugin from './middleware/auth.js';

export type AppConfig = {
  enableCors?: boolean;
  corsOrigins?: string[];
  logger?: boolean | Record<string, unknown>;
};

export function buildApp(config: AppConfig = {}): FastifyInstance {
  const app = fastify({ logger: config.logger ?? true });

  if (config.enableCors) {
    app.register(cors, {
      origin: config.corsOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    });
  }

  // Auth
  app.register(authPlugin);

  // Routes
  app.register(healthRoutes, { prefix: '/api' });
  app.register(gameRoutes, { prefix: '/api' });

  // Root
  app.get('/', async () => ({ message: 'SportsHub API is running! 🏈⚽🏀' }));

  // Not found
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'Not Found', path: req.url });
  });

  // Error handler
  app.setErrorHandler((err, req, reply) => {
    req.log.error(err);
    const status = err.statusCode ?? 500;
    reply.code(status).send({
      error: status === 500 ? 'Internal Server Error' : err.name,
      message: err.message,
    });
  });

  return app;
}

export type App = ReturnType<typeof buildApp>;

