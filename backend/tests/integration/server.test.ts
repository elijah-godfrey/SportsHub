import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Server Integration', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp({
            enableCors: true,
            corsOrigins: ['http://localhost:3000'],
            logger: false
        });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete App Integration', () => {
        it('should have all required routes registered', async () => {
            const routes = [
                { method: 'GET', url: '/' },
                { method: 'GET', url: '/api/health' },
                { method: 'GET', url: '/api/auth/session' }
            ] as const;

            for (const route of routes) {
                const response = await app.inject(route);
                expect(response.statusCode).toBeLessThan(500);
            }
        });

        it('should handle concurrent requests', async () => {
            const requests = Array.from({ length: 10 }, (_, i) =>
                app.inject({
                    method: 'GET',
                    url: '/',
                })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.statusCode).toBe(200);
            });
        });

        it('should properly handle different HTTP methods', async () => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE'];

            for (const method of methods) {
                const response = await app.inject({
                    method: method as any,
                    url: '/api/health'
                });

                // Health endpoint should only respond to GET
                if (method === 'GET') {
                    expect(response.statusCode).toBe(200);
                } else {
                    expect(response.statusCode).toBe(404);
                }
            }
        });

        it('should maintain proper error handling across the app', async () => {
            // Test various error scenarios
            const errorTests = [
                { url: '/nonexistent', expectedStatus: 404 },
                { url: '/api/nonexistent', expectedStatus: 404 },
            ];

            for (const test of errorTests) {
                const response = await app.inject({
                    method: 'GET',
                    url: test.url
                });

                expect(response.statusCode).toBe(test.expectedStatus);

                const body = JSON.parse(response.body);
                expect(body).toHaveProperty('error');
            }
        });

        it('should provide consistent response format', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('application/json');

            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('message');
        });
    });

    describe('Environment Configuration', () => {
        it('should handle different configurations gracefully', async () => {
            const configs = [
                { enableCors: false, logger: false },
                { enableCors: true, corsOrigins: ['http://test.com'], logger: false },
                { logger: { level: 'error' } }
            ];

            for (const config of configs) {
                const testApp = buildApp(config);
                await testApp.ready();

                const response = await testApp.inject({
                    method: 'GET',
                    url: '/'
                });

                expect(response.statusCode).toBe(200);
                await testApp.close();
            }
        });
    });
});
