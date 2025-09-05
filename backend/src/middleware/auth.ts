import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '../config/auth.js';

declare module 'fastify' {
    interface FastifyInstance {
        requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        optionalAuth: (request: FastifyRequest) => Promise<any>;
    }

    interface FastifyRequest {
        user?: any;
    }
}

export default fastifyPlugin(async function authPlugin(fastify: FastifyInstance) {
    // Add auth routes
    fastify.all('/api/auth/*', async (request, reply) => {
        try {
            // Convert Fastify request to Web API Request
            const url = new URL(request.url, `http://${request.headers.host}`);

            const headers = new Headers();
            Object.entries(request.headers).forEach(([key, value]) => {
                if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
            });

            const webRequest = new Request(url.toString(), {
                method: request.method,
                headers,
                body: request.body ? JSON.stringify(request.body) : undefined,
            });

            const response = await auth.handler(webRequest);

            // Forward response
            reply.status(response.status);
            response.headers.forEach((value, key) => reply.header(key, value));

            const responseBody = await response.text();
            return responseBody ? JSON.parse(responseBody) : null;
        } catch (error) {
            fastify.log.error(error, 'Auth handler error:');
            return reply.status(500).send({ error: 'Authentication error' });
        }
    });

    // Middleware to get user from session (optional)
    fastify.decorate('optionalAuth', async function (request: FastifyRequest) {
        try {
            const session = await auth.api.getSession({
                headers: request.headers as any,
            });

            if (session?.user) {
                request.user = session.user;
                return session.user;
            }
            return null;
        } catch (error) {
            return null;
        }
    });

    // Middleware to require authentication
    fastify.decorate('requireAuth', async function (request: FastifyRequest, reply: FastifyReply) {
        const user = await fastify.optionalAuth(request);

        if (!user) {
            reply.status(401).send({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
            throw new Error('Authentication required');
        }
    });

    // Hook to add user to all requests
    fastify.addHook('preHandler', async (request) => {
        await fastify.optionalAuth(request);
    });
});
