import { io, Socket } from 'socket.io-client';
import type { GameUpdateEvent } from '@/types/game';

class SocketService {
    private socket: Socket | null = null;
    private isConnecting = false;

    connect(): Promise<Socket> {
        if (this.socket?.connected) {
            return Promise.resolve(this.socket);
        }

        if (this.isConnecting) {
            return new Promise((resolve) => {
                const checkConnection = () => {
                    if (this.socket?.connected) {
                        resolve(this.socket);
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }

        this.isConnecting = true;

        return new Promise((resolve, reject) => {
            this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
                transports: ['websocket', 'polling'],
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to Socket.IO server');
                this.isConnecting = false;
                resolve(this.socket!);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
                this.isConnecting = false;
                reject(error);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from Socket.IO server');
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Subscribe to all live updates
    subscribeToAll() {
        if (this.socket) {
            this.socket.emit('subscribe:all');
        }
    }

    // Subscribe to sport-specific updates
    subscribeToSport(sportId: string) {
        if (this.socket) {
            this.socket.emit('subscribe:sport', sportId);
        }
    }

    // Subscribe to game-specific updates
    subscribeToGame(gameId: string) {
        if (this.socket) {
            this.socket.emit('subscribe:game', gameId);
        }
    }

    // Listen for game updates
    onGameUpdate(callback: (data: GameUpdateEvent) => void) {
        if (this.socket) {
            this.socket.on('game_update', callback);
        }
    }

    // Listen for score updates
    onScoreUpdate(callback: (data: GameUpdateEvent) => void) {
        if (this.socket) {
            this.socket.on('score_update', callback);
        }
    }

    // Remove listeners
    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }
}

export const socketService = new SocketService();
