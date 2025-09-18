import { AdapterResponse, GameData } from '../../types/game.js';

export abstract class SportAdapter {
    abstract readonly sport: string;
    abstract readonly league: string;

    /**
     * Fetch today's scheduled games
     */
    abstract fetchTodaysGames(): Promise<AdapterResponse<GameData[]>>;

    /**
     * Fetch live games with current scores
     */
    abstract fetchLiveGames(): Promise<AdapterResponse<GameData[]>>;

    /**
     * Get adapter health status
     */
    async getHealth(): Promise<{ healthy: boolean; lastCall?: Date }> {
        return { healthy: true };
    }
}
