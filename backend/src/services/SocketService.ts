import { Server as SocketIOServer } from 'socket.io';
import { FastifyInstance } from 'fastify';
import type { RTCSessionDescriptionInit, RTCIceCandidateInit } from '../types/screenShare.js';

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

            // Screen sharing events
            this.setupScreenShareHandlers(socket);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                // Handle cleanup for screen sharing if user was in a session
                this.handleScreenShareDisconnect(socket.id);
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
     * Setup screen sharing event handlers
     */
    private setupScreenShareHandlers(socket: any) {
        // Join screen share session room
        socket.on('screen-share:join', (data: { sessionId: string; userId?: string }) => {
            const roomName = `screen-share:${data.sessionId}`;
            socket.join(roomName);
            console.log(`Client ${socket.id} joined screen share session ${data.sessionId}`);

            // Store session info for cleanup
            socket.screenShareSession = data.sessionId;
            socket.screenShareUserId = data.userId;

            // Notify others in the room about new viewer
            socket.to(roomName).emit('screen-share:viewer-joined', {
                sessionId: data.sessionId,
                viewerId: socket.id,
                userId: data.userId,
            });
        });

        // Leave screen share session room
        socket.on('screen-share:leave', (data: { sessionId: string }) => {
            const roomName = `screen-share:${data.sessionId}`;
            socket.leave(roomName);
            console.log(`Client ${socket.id} left screen share session ${data.sessionId}`);

            // Notify others in the room about viewer leaving
            socket.to(roomName).emit('screen-share:viewer-left', {
                sessionId: data.sessionId,
                viewerId: socket.id,
            });

            // Clean up stored session info
            delete socket.screenShareSession;
            delete socket.screenShareUserId;
        });

        // WebRTC signaling events
        socket.on('screen-share:offer', (data: {
            sessionId: string;
            viewerId: string;
            offer: RTCSessionDescriptionInit;
        }) => {
            // Forward offer to specific viewer
            socket.to(data.viewerId).emit('screen-share:offer', {
                sessionId: data.sessionId,
                hostId: socket.id,
                offer: data.offer,
            });
        });

        socket.on('screen-share:answer', (data: {
            sessionId: string;
            hostId: string;
            answer: RTCSessionDescriptionInit;
        }) => {
            // Forward answer to host
            socket.to(data.hostId).emit('screen-share:answer', {
                sessionId: data.sessionId,
                viewerId: socket.id,
                answer: data.answer,
            });
        });

        socket.on('screen-share:ice-candidate', (data: {
            sessionId: string;
            targetId: string;
            candidate: RTCIceCandidateInit;
        }) => {
            // Forward ICE candidate to target peer
            socket.to(data.targetId).emit('screen-share:ice-candidate', {
                sessionId: data.sessionId,
                senderId: socket.id,
                candidate: data.candidate,
            });
        });
    }

    /**
     * Handle cleanup when a user disconnects from screen sharing
     */
    private handleScreenShareDisconnect(socketId: string) {
        // This will be called by the ScreenShareService to handle cleanup
        // when a host or viewer disconnects
        console.log(`Handling screen share disconnect for socket ${socketId}`);
    }

    /**
     * Emit screen share session update to all viewers
     */
    emitSessionUpdate(sessionId: string, event: string, data: any) {
        if (!this.io) return;

        const roomName = `screen-share:${sessionId}`;
        this.io.to(roomName).emit(event, data);
        console.log(`Emitted ${event} to screen share session ${sessionId}`);
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
