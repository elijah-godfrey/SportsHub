import { Server as SocketIOServer } from 'socket.io';
import { FastifyInstance } from 'fastify';

export interface GameUpdateEvent {
    type: 'game_update' | 'game_new' | 'score_update';
    gameId: string;
    sportId: string;
    data: any;
}

export class SocketService {
    private io: SocketIOServer | null = null;

    /**
     * Initialize Socket.IO with Fastify server
     */
    async initialize(fastify: FastifyInstance) {
        this.io = new SocketIOServer(fastify.server, {
            cors: {
                origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
                credentials: true,
            },
        });

        this.setupEventHandlers();
        console.log('✅ Socket.IO server initialized');
    }

    /**
     * Setup Socket.IO event handlers
     */
    private setupEventHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Subscribe to all live updates
            socket.on('subscribe:all', () => {
                socket.join('live:all');
                console.log(`Client ${socket.id} subscribed to all live updates`);
            });

            // Subscribe to sport-specific updates
            socket.on('subscribe:sport', (sportId: string) => {
                socket.join(`live:sport:${sportId}`);
                console.log(`Client ${socket.id} subscribed to sport ${sportId}`);
            });

            // Subscribe to specific game updates
            socket.on('subscribe:game', (gameId: string) => {
                socket.join(`live:game:${gameId}`);
                console.log(`Client ${socket.id} subscribed to game ${gameId}`);
            });

            // Unsubscribe from updates
            socket.on('unsubscribe:all', () => {
                socket.leave('live:all');
            });

            socket.on('unsubscribe:sport', (sportId: string) => {
                socket.leave(`live:sport:${sportId}`);
            });

            socket.on('unsubscribe:game', (gameId: string) => {
                socket.leave(`live:game:${gameId}`);
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    /**
     * Emit game update to all relevant subscribers
     */
    emitGameUpdate(event: GameUpdateEvent) {
        if (!this.io) return;

        const { type, gameId, sportId, data } = event;

        // Emit to all subscribers
        this.io.to('live:all').emit(type, data);

        // Emit to sport subscribers
        this.io.to(`live:sport:${sportId}`).emit(type, data);

        // Emit to game-specific subscribers
        this.io.to(`live:game:${gameId}`).emit(type, data);

        console.log(`Emitted ${type} for game ${gameId} to ${this.getSubscriberCount()} clients`);
    }

    /**
     * Get total number of connected clients
     */
    getSubscriberCount(): number {
        return this.io?.engine.clientsCount || 0;
    }

    /**
     * Get Socket.IO instance
     */
    getIO(): SocketIOServer | null {
        return this.io;
    }
}

// Singleton instance
export const socketService = new SocketService();
