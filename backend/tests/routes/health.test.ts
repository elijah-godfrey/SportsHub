import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Health Routes', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        app = buildApp({ logger: false });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    it('should return healthy status', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/health'
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toEqual({
            status: 'healthy',
            timestamp: expect.any(String),
            uptime: expect.any(Number)
        });
    });

    it('should return valid timestamp', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/health'
        });

        const body = JSON.parse(response.body);
        const timestamp = new Date(body.timestamp);

        expect(timestamp.getTime()).not.toBeNaN();
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return positive uptime', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/health'
        });

        const body = JSON.parse(response.body);
        expect(body.uptime).toBeGreaterThan(0);
    });
});
