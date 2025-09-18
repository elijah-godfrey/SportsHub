import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { SportAdapter } from '../adapters/index.js';
import { GameService } from '../services/GameService.js';
import { socketService } from '../services/SocketService.js';
import { PrismaClient } from '@prisma/client';

interface JobData {
    type: 'daily' | 'live';
    sportId: string;
}

export class SoccerJobs {
    private queue: Queue;
    private worker: Worker;
    private gameService: GameService;

    constructor(private adapter: SportAdapter, prisma: PrismaClient) {
        this.gameService = new GameService(prisma);

        this.queue = new Queue('soccer-polling', {
            connection: redis,
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 5,
            },
        });

        this.worker = new Worker(
            'soccer-polling',
            async (job: Job<JobData>) => {
                await this.processJob(job);
            },
            {
                connection: redis,
                concurrency: 1,
            }
        );

        this.worker.on('failed', (job: Job | undefined, err: Error) => {
            console.error(`Job ${job?.id} failed:`, err);
        });
    }

    private async processJob(job: Job<JobData>) {
        const { type, sportId } = job.data;

        try {
            let response;

            if (type === 'daily') {
                response = await this.adapter.fetchTodaysGames();
            } else {
                response = await this.adapter.fetchLiveGames();
            }

            if (response.success && response.data) {
                // Process each game and emit real-time updates
                for (const gameData of response.data) {
                    const game = await this.gameService.upsertGame(sportId, gameData);

                    // Emit real-time update for live games
                    if (gameData.status === 'IN_PROGRESS') {
                        socketService.emitGameUpdate({
                            type: 'game_update',
                            gameId: game.id,
                            sportId: game.sportId,
                            data: {
                                id: game.id,
                                homeTeam: gameData.homeTeam.name,
                                awayTeam: gameData.awayTeam.name,
                                score: gameData.score,
                                status: gameData.status,
                                period: gameData.period,
                                clock: gameData.clock,
                                updatedAt: new Date().toISOString(),
                            },
                        });
                    }
                }

                console.log(`Processed ${response.data.length} games for ${type} poll`);
            } else {
                console.error(`Failed to fetch ${type} games:`, response.error);
            }
        } catch (error) {
            console.error(`Error processing ${type} job:`, error);
            throw error;
        }
    }

    /**
     * Schedule daily games fetch at 6 AM
     */
    async scheduleDailyFetch(sportId: string) {
        await this.queue.add(
            'daily-fetch',
            { type: 'daily', sportId },
            {
                repeat: {
                    pattern: '0 6 * * *', // Every day at 6 AM
                },
            }
        );
    }

    /**
     * Schedule live polling every 30 seconds
     */
    async scheduleLivePolling(sportId: string) {
        await this.queue.add(
            'live-polling',
            { type: 'live', sportId },
            {
                repeat: {
                    every: 30000, // Every 30 seconds
                },
            }
        );
    }

    /**
     * Trigger immediate fetch
     */
    async triggerFetch(type: 'daily' | 'live', sportId: string) {
        return this.queue.add(`${type}-immediate`, { type, sportId });
    }

    async close() {
        await this.worker.close();
        await this.queue.close();
    }
}
