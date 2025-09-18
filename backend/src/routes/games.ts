import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { GameService } from '../services/GameService.js';

const prisma = new PrismaClient();
const gameService = new GameService(prisma);

interface GameParams {
    sportId: string;
}

export async function gameRoutes(fastify: FastifyInstance) {
    // Get today's games for a sport
    fastify.get('/games/today/:sportId', async (
        request: FastifyRequest<{ Params: GameParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sportId } = request.params;
            const games = await gameService.getTodaysGames(sportId);

            return {
                success: true,
                data: games,
                count: games.length,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch today\'s games',
            });
        }
    });

    // Get live games for a sport
    fastify.get('/games/live/:sportId', async (
        request: FastifyRequest<{ Params: GameParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sportId } = request.params;
            const games = await gameService.getLiveGames(sportId);

            return {
                success: true,
                data: games,
                count: games.length,
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch live games',
            });
        }
    });

    // Get all games (today's + live) for a sport
    fastify.get('/games/:sportId', async (
        request: FastifyRequest<{ Params: GameParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { sportId } = request.params;
            const [todaysGames, liveGames] = await Promise.all([
                gameService.getTodaysGames(sportId),
                gameService.getLiveGames(sportId),
            ]);

            // Merge and deduplicate games
            const allGames = [...todaysGames];
            const todaysGameIds = new Set(todaysGames.map(g => g.id));

            for (const liveGame of liveGames) {
                if (!todaysGameIds.has(liveGame.id)) {
                    allGames.push(liveGame);
                }
            }

            return {
                success: true,
                data: allGames,
                count: allGames.length,
                breakdown: {
                    today: todaysGames.length,
                    live: liveGames.length,
                },
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch games',
            });
        }
    });
}
