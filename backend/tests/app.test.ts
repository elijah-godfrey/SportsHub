import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp, type AppConfig } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('App Factory', () => {
    let app: FastifyInstance;

    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('buildApp', () => {
        it('should create app with default config', async () => {
            app = buildApp();
            await app.ready();

            expect(app).toBeDefined();
            expect(app.server).toBeDefined();
        });

        it('should create app with custom config', async () => {
            const config: AppConfig = {
                enableCors: true,
                corsOrigins: ['http://test.com'],
                logger: false
            };

            app = buildApp(config);
            await app.ready();

            expect(app).toBeDefined();
        });

        it('should create app without CORS when disabled', async () => {
            app = buildApp({ enableCors: false });
            await app.ready();

            expect(app).toBeDefined();
        });
    });

    describe('Routes', () => {
        beforeEach(async () => {
            app = buildApp({ logger: false });
            await app.ready();
        });

        it('should respond to root route', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('SportsHub API is running! 🏈⚽🏀');
        });

        it('should respond to health check', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/health'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.status).toBe('healthy');
        });

        it('should handle 404 for unknown routes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/unknown-route'
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Not Found');
            expect(body.path).toBe('/unknown-route');
        });
    });

    describe('Auth Integration', () => {
        beforeEach(async () => {
            app = buildApp({ logger: false });
            await app.ready();
        });

        it('should have auth decorators available', () => {
            expect(app.requireAuth).toBeDefined();
            expect(app.optionalAuth).toBeDefined();
        });

        it('should handle auth routes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/auth/session'
            });

            expect([200, 401, 404]).toContain(response.statusCode);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            app = buildApp({ logger: false });

            app.get('/test-error', async () => {
                throw new Error('Test error');
            });

            await app.ready();
        });

        it('should handle internal server errors', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/test-error'
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Internal Server Error');
            expect(body.message).toBe('Test error');
        });
    });

    describe('CORS Configuration', () => {
        it('should enable CORS when configured', async () => {
            app = buildApp({
                enableCors: true,
                corsOrigins: ['http://localhost:3000'],
                logger: false
            });
            await app.ready();

            const response = await app.inject({
                method: 'OPTIONS',
                url: '/',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
            });

            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        });

        it('should not have CORS headers when disabled', async () => {
            app = buildApp({
                enableCors: false,
                logger: false
            });
            await app.ready();

            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.headers['access-control-allow-origin']).toBeUndefined();
        });
    });
});
