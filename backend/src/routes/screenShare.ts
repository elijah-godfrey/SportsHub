import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ScreenShareService } from '../services/ScreenShareService.js';
import type {
    CreateScreenShareRequest,
    UpdateScreenShareRequest
} from '../types/screenShare.js';

const prisma = new PrismaClient();
const screenShareService = new ScreenShareService(prisma);

// Validation schemas
const createSessionSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    gameId: z.string().uuid().optional(),
    isPublic: z.boolean().optional().default(true),
    maxViewers: z.number().min(1).max(100).optional(),
});

const updateSessionSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']).optional(),
    isPublic: z.boolean().optional(),
    maxViewers: z.number().min(1).max(100).optional(),
});

interface SessionParams {
    sessionId: string;
}

interface GameParams {
    gameId: string;
}

export async function screenShareRoutes(fastify: FastifyInstance) {
    // Create new screen share session
    fastify.post('/screen-share/sessions', async (
        request: FastifyRequest<{ Body: CreateScreenShareRequest }>,
        reply: FastifyReply
    ) => {
        try {
            // Require authentication
            await fastify.requireAuth(request, reply);

            const validation = createSessionSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid request data',
                    details: validation.error.errors,
                });
            }

            const session = await screenShareService.createSession(
                request.user.id,
                validation.data
            );

            return {
                success: true,
                data: session,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to create screen share session',
            });
        }
    });

    // Get active screen share sessions
    fastify.get('/screen-share/sessions', async (
        request: FastifyRequest<{ Querystring: { limit?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const limit = parseInt(request.query.limit || '20');
            const sessions = await screenShareService.getActiveSessions(limit);

            return {
                success: true,
                data: sessions,
                count: sessions.length,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch screen share sessions',
            });
        }
    });

    // Get specific session
    fastify.get('/screen-share/sessions/:sessionId', async (
        request: FastifyRequest<{ Params: SessionParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sessionId } = request.params;
            const session = await screenShareService.getSessionById(sessionId);

            if (!session) {
                return reply.status(404).send({
                    success: false,
                    error: 'Session not found',
                });
            }

            return {
                success: true,
                data: session,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch session',
            });
        }
    });

    // Update session (host only)
    fastify.patch('/screen-share/sessions/:sessionId', async (
        request: FastifyRequest<{
            Params: SessionParams;
            Body: UpdateScreenShareRequest;
        }>,
        reply: FastifyReply
    ) => {
        try {
            // Require authentication
            await fastify.requireAuth(request, reply);

            const { sessionId } = request.params;
            const validation = updateSessionSchema.safeParse(request.body);

            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid request data',
                    details: validation.error.errors,
                });
            }

            const session = await screenShareService.updateSession(
                sessionId,
                request.user.id,
                validation.data
            );

            if (!session) {
                return reply.status(404).send({
                    success: false,
                    error: 'Session not found or access denied',
                });
            }

            return {
                success: true,
                data: session,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to update session',
            });
        }
    });

    // End session (host only)
    fastify.delete('/screen-share/sessions/:sessionId', async (
        request: FastifyRequest<{ Params: SessionParams }>,
        reply: FastifyReply
    ) => {
        try {
            // Require authentication
            await fastify.requireAuth(request, reply);

            const { sessionId } = request.params;
            await screenShareService.endSession(sessionId, request.user.id);

            return {
                success: true,
                message: 'Session ended successfully',
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to end session',
            });
        }
    });

    // Join session as viewer
    fastify.post('/screen-share/sessions/:sessionId/join', async (
        request: FastifyRequest<{ Params: SessionParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sessionId } = request.params;

            // Optional auth - allow anonymous viewers
            const user = await fastify.optionalAuth(request);

            const result = await screenShareService.joinSession(
                sessionId,
                user?.id
            );

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            request.log.error(error);

            if (error instanceof Error) {
                if (error.message === 'Session not found') {
                    return reply.status(404).send({
                        success: false,
                        error: error.message,
                    });
                }
                if (error.message === 'Session is not active' || error.message === 'Session is full') {
                    return reply.status(400).send({
                        success: false,
                        error: error.message,
                    });
                }
            }

            return reply.status(500).send({
                success: false,
                error: 'Failed to join session',
            });
        }
    });

    // Leave session as viewer
    fastify.post('/screen-share/sessions/:sessionId/leave', async (
        request: FastifyRequest<{ Params: SessionParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sessionId } = request.params;

            // Optional auth - allow anonymous viewers
            const user = await fastify.optionalAuth(request);

            await screenShareService.leaveSession(sessionId, user?.id);

            return {
                success: true,
                message: 'Left session successfully',
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to leave session',
            });
        }
    });

    // Get sessions for a specific game
    fastify.get('/screen-share/games/:gameId/sessions', async (
        request: FastifyRequest<{ Params: GameParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { gameId } = request.params;
            const sessions = await screenShareService.getSessionsForGame(gameId);

            return {
                success: true,
                data: sessions,
                count: sessions.length,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch game sessions',
            });
        }
    });

    // Get user's hosted sessions
    fastify.get('/screen-share/my-sessions', async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            // Require authentication
            await fastify.requireAuth(request, reply);

            const sessions = await screenShareService.getUserSessions(request.user.id);

            return {
                success: true,
                data: sessions,
                count: sessions.length,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch user sessions',
            });
        }
    });
}
