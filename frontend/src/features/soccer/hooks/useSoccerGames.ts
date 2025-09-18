import { useState, useEffect, useCallback } from 'react';
import { getSoccerGames } from '../api';
import { socketService } from '@/services/socketService';
import type { Game, GameUpdateEvent } from '@/types/game';

export const useSoccerGames = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string>('');

    // Handle real-time game updates
    const handleGameUpdate = useCallback((updateData: GameUpdateEvent) => {
        setGames(currentGames =>
            currentGames.map(game => {
                if (game.id === updateData.id) {
                    return {
                        ...game,
                        score: updateData.score,
                        status: updateData.status as Game['status'],
                        period: updateData.period,
                        clock: updateData.clock,
                    };
                }
                return game;
            })
        );
    }, []);

    // Fetch initial games data
    const fetchGames = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getSoccerGames();

            if (response.success) {
                setGames(response.data);
                setMessage(response.message || '');
            } else {
                setError('Failed to fetch games');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Setup Socket.IO connection and subscriptions
    useEffect(() => {
        let isSubscribed = true;

        const setupSocket = async () => {
            try {
                await socketService.connect();

                if (isSubscribed) {
                    // Subscribe to all live updates
                    socketService.subscribeToAll();

                    // Listen for game updates
                    socketService.onGameUpdate(handleGameUpdate);
                    socketService.onScoreUpdate(handleGameUpdate);
                }
            } catch (error) {
                console.error('Failed to setup socket connection:', error);
            }
        };

        setupSocket();
        fetchGames();

        return () => {
            isSubscribed = false;
            socketService.removeAllListeners();
        };
    }, [fetchGames, handleGameUpdate]);

    return {
        games,
        loading,
        error,
        message,
        refetch: fetchGames,
    };
};
