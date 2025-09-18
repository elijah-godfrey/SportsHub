import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { GameService } from '../services/GameService.js';
import { SportsService } from '../services/SportsService.js';

const prisma = new PrismaClient();
const gameService = new GameService(prisma);
const sportsService = new SportsService(prisma);

interface GameParams {
    sportId: string;
}

export async function gameRoutes(fastify: FastifyInstance) {
    // Convenience route for soccer games (most common use case)
    fastify.get('/games/soccer', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const sportId = await sportsService.getSoccerSportId();
            const [upcomingGames, liveGames] = await Promise.all([
                gameService.getTodaysGames(sportId),
                gameService.getLiveGames(sportId),
            ]);

            // Merge and deduplicate games
            const allGames = [...upcomingGames];
            const upcomingGameIds = new Set(upcomingGames.map(g => g.id));

            for (const liveGame of liveGames) {
                if (!upcomingGameIds.has(liveGame.id)) {
                    allGames.push(liveGame);
                }
            }

            return {
                success: true,
                data: allGames,
                count: allGames.length,
                breakdown: {
                    upcoming: upcomingGames.length,
                    live: liveGames.length,
                },
                message: upcomingGames.length > 0 ? `Next ${upcomingGames.length} upcoming Premier League games` : 'No upcoming Premier League games found',
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch soccer games',
            });
        }
    });

    // Get next upcoming games for a sport (next closest game day)
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
                message: games.length > 0 ? `Next ${games.length} upcoming games` : 'No upcoming games found',
            };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch upcoming games',
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
