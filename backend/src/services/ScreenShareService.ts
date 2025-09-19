import { PrismaClient } from '@prisma/client';
import { socketService } from './SocketService.js';
import { screenShareConfig } from '../config/screenShare.js';
import type {
    ScreenShareSession,
    CreateScreenShareRequest,
    UpdateScreenShareRequest,
    ScreenShareViewer,
    RTCIceServer
} from '../types/screenShare.js';

export class ScreenShareService {
    constructor(private prisma: PrismaClient) { }

    // Note: These methods will work once the Prisma migration is run
    // The linting errors are expected until the database schema is updated

    private transformSession(session: any): ScreenShareSession {
        return {
            ...session,
            gameId: session.gameId || undefined,
            description: session.description || undefined,
            maxViewers: session.maxViewers || undefined,
            host: session.host ? {
                ...session.host,
                image: session.host.image || undefined,
            } : undefined,
            status: session.status as 'ACTIVE' | 'PAUSED' | 'ENDED',
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt?.toISOString(),
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
        };
    }

    /**
     * Create a new screen share session
     */
    async createSession(
        hostUserId: string,
        data: CreateScreenShareRequest
    ): Promise<ScreenShareSession> {
        const session = await this.prisma.screenShareSession.create({
            data: {
                hostUserId,
                title: data.title,
                description: data.description,
                gameId: data.gameId,
                isPublic: data.isPublic ?? true,
                maxViewers: Math.min(data.maxViewers ?? 50, screenShareConfig.limits.maxViewersPerSession),
                status: 'ACTIVE',
            },
            include: {
                host: {
                    select: { id: true, name: true, image: true },
                },
                game: {
                    select: {
                        id: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        status: true,
                    },
                },
            },
        });

        console.log(`✅ Created screen share session: ${session.id} by user ${hostUserId}`);
        return this.transformSession(session);
    }

    /**
     * Get active screen share sessions
     */
    async getActiveSessions(limit: number = 20): Promise<ScreenShareSession[]> {
        const sessions = await this.prisma.screenShareSession.findMany({
            where: {
                status: 'ACTIVE',
                isPublic: true,
            },
            include: {
                host: {
                    select: { id: true, name: true, image: true },
                },
                game: {
                    select: {
                        id: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        status: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: limit,
        });

        return sessions.map(session => this.transformSession(session));
    }

    /**
     * Get session by ID
     */
    async getSessionById(sessionId: string): Promise<ScreenShareSession | null> {
        const session = await this.prisma.screenShareSession.findUnique({
            where: { id: sessionId },
            include: {
                host: {
                    select: { id: true, name: true, image: true },
                },
                game: {
                    select: {
                        id: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        status: true,
                    },
                },
                viewers: {
                    where: { isActive: true },
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
            },
        });

        if (!session) return null;

        return this.transformSession(session);
    }

    /**
     * Update session
     */
    async updateSession(
        sessionId: string,
        hostUserId: string,
        data: UpdateScreenShareRequest
    ): Promise<ScreenShareSession | null> {
        // Verify ownership
        const session = await this.prisma.screenShareSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.hostUserId !== hostUserId) {
            throw new Error('Session not found or access denied');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
        if (data.maxViewers !== undefined) {
            updateData.maxViewers = Math.min(data.maxViewers, screenShareConfig.limits.maxViewersPerSession);
        }
        if (data.status !== undefined) {
            updateData.status = data.status;
            if (data.status === 'ENDED') {
                updateData.endedAt = new Date();
            }
        }

        const updatedSession = await this.prisma.screenShareSession.update({
            where: { id: sessionId },
            data: updateData,
            include: {
                host: {
                    select: { id: true, name: true, image: true },
                },
                game: {
                    select: {
                        id: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        status: true,
                    },
                },
            },
        });

        const sessionResponse = this.transformSession(updatedSession);

        // Emit update to all viewers
        socketService.emitSessionUpdate(sessionId, 'screen-share:session-updated', sessionResponse);

        console.log(`✅ Updated screen share session: ${sessionId}`);
        return sessionResponse;
    }

    /**
     * End session
     */
    async endSession(sessionId: string, hostUserId: string): Promise<void> {
        await this.updateSession(sessionId, hostUserId, { status: 'ENDED' });

        // Notify all viewers that session has ended
        socketService.emitSessionUpdate(sessionId, 'screen-share:session-ended', { sessionId });

        // End all active viewer sessions
        await this.prisma.screenShareViewer.updateMany({
            where: {
                sessionId,
                isActive: true,
            },
            data: {
                isActive: false,
                leftAt: new Date(),
            },
        });

        console.log(`✅ Ended screen share session: ${sessionId}`);
    }

    /**
     * Join session as viewer
     */
    async joinSession(sessionId: string, userId?: string): Promise<{
        session: ScreenShareSession;
        viewerId: string;
        iceServers: RTCIceServer[];
    }> {
        const session = await this.getSessionById(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.status !== 'ACTIVE') {
            throw new Error('Session is not active');
        }

        // Check viewer limit
        if (session.maxViewers && session.currentViewers >= session.maxViewers) {
            throw new Error('Session is full');
        }

        // Create or update viewer record
        const viewer = await this.prisma.screenShareViewer.upsert({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: userId || '',
                },
            },
            update: {
                isActive: true,
                leftAt: null,
            },
            create: {
                sessionId,
                userId,
                isActive: true,
            },
        });

        // Update session viewer count
        await this.prisma.screenShareSession.update({
            where: { id: sessionId },
            data: {
                currentViewers: {
                    increment: 1,
                },
                totalViews: {
                    increment: 1,
                },
            },
        });

        console.log(`✅ User ${userId || 'anonymous'} joined session: ${sessionId}`);

        return {
            session,
            viewerId: viewer.id,
            iceServers: screenShareConfig.iceServers,
        };
    }

    /**
     * Leave session as viewer
     */
    async leaveSession(sessionId: string, userId?: string): Promise<void> {
        // Mark viewer as inactive
        await this.prisma.screenShareViewer.updateMany({
            where: {
                sessionId,
                userId: userId || undefined,
                isActive: true,
            },
            data: {
                isActive: false,
                leftAt: new Date(),
            },
        });

        // Update session viewer count
        await this.prisma.screenShareSession.update({
            where: { id: sessionId },
            data: {
                currentViewers: {
                    decrement: 1,
                },
            },
        });

        console.log(`✅ User ${userId || 'anonymous'} left session: ${sessionId}`);
    }

    /**
     * Get sessions for a specific game
     */
    async getSessionsForGame(gameId: string): Promise<ScreenShareSession[]> {
        const sessions = await this.prisma.screenShareSession.findMany({
            where: {
                gameId,
                status: 'ACTIVE',
                isPublic: true,
            },
            include: {
                host: {
                    select: { id: true, name: true, image: true },
                },
            },
            orderBy: { startedAt: 'desc' },
        });

        return sessions.map(session => this.transformSession(session));
    }

    /**
     * Get user's hosted sessions
     */
    async getUserSessions(userId: string): Promise<ScreenShareSession[]> {
        const sessions = await this.prisma.screenShareSession.findMany({
            where: { hostUserId: userId },
            include: {
                game: {
                    select: {
                        id: true,
                        homeTeam: { select: { name: true } },
                        awayTeam: { select: { name: true } },
                        status: true,
                    },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 20,
        });

        return sessions.map(session => this.transformSession(session));
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions(): Promise<void> {
        const timeoutMinutes = screenShareConfig.limits.sessionTimeoutMinutes;
        const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

        const expiredSessions = await this.prisma.screenShareSession.findMany({
            where: {
                status: 'ACTIVE',
                startedAt: {
                    lt: cutoffTime,
                },
            },
        });

        for (const session of expiredSessions) {
            await this.endSession(session.id, session.hostUserId);
        }

        if (expiredSessions.length > 0) {
            console.log(`🧹 Cleaned up ${expiredSessions.length} expired screen share sessions`);
        }
    }
}
