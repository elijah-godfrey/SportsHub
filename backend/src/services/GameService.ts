import { PrismaClient } from '@prisma/client';
import { GameData, TeamData } from '../types/game.js';

export class GameService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Upsert teams for a sport
     */
    async upsertTeam(sportId: string, teamData: TeamData) {
        return this.prisma.team.upsert({
            where: {
                sportId_externalId: {
                    sportId,
                    externalId: teamData.externalId,
                },
            },
            update: {
                name: teamData.name,
                shortName: teamData.shortName,
                logoUrl: teamData.logoUrl,
            },
            create: {
                sportId,
                name: teamData.name,
                shortName: teamData.shortName,
                externalId: teamData.externalId,
                logoUrl: teamData.logoUrl,
            },
        });
    }

    /**
     * Upsert game data
     */
    async upsertGame(sportId: string, gameData: GameData) {
        // First ensure teams exist
        const homeTeam = await this.upsertTeam(sportId, gameData.homeTeam);
        const awayTeam = await this.upsertTeam(sportId, gameData.awayTeam);

        // Upsert the game
        const game = await this.prisma.game.upsert({
            where: {
                sportId_externalId: {
                    sportId,
                    externalId: gameData.externalId,
                },
            },
            update: {
                startTime: new Date(gameData.startTime),
                status: gameData.status,
                period: gameData.period,
                clock: gameData.clock,
                venue: gameData.venue,
            },
            create: {
                sportId,
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id,
                startTime: new Date(gameData.startTime),
                status: gameData.status,
                period: gameData.period,
                clock: gameData.clock,
                venue: gameData.venue,
                externalId: gameData.externalId,
                adapter: 'football-data',
            },
        });

        // Update score if provided
        if (gameData.score) {
            await this.prisma.gameScore.upsert({
                where: { gameId: game.id },
                update: {
                    homeScore: gameData.score.home,
                    awayScore: gameData.score.away,
                },
                create: {
                    gameId: game.id,
                    homeScore: gameData.score.home,
                    awayScore: gameData.score.away,
                },
            });
        }

        return game;
    }

    /**
     * Get next upcoming games for a sport (finds the next closest game day)
     */
    async getTodaysGames(sportId: string) {
        // Find the next upcoming game
        const nextGame = await this.prisma.game.findFirst({
            where: {
                sportId,
                startTime: {
                    gte: new Date(),
                },
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        if (!nextGame) {
            return []; // No upcoming games
        }

        // Get all games on the same day as the next game
        const gameDate = new Date(nextGame.startTime);
        const startOfDay = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        return this.prisma.game.findMany({
            where: {
                sportId,
                startTime: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                score: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });
    }

    /**
     * Get live games for a sport
     */
    async getLiveGames(sportId: string) {
        return this.prisma.game.findMany({
            where: {
                sportId,
                status: 'IN_PROGRESS',
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                score: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });
    }
}
