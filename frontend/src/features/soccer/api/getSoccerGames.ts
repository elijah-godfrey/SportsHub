import { apiGet } from '@/lib/api-client';
import type { GamesResponse } from '@/types/game';

export const getSoccerGames = async (): Promise<GamesResponse> => {
    const response = await apiGet<GamesResponse>('/api/games/soccer');
    return response.data;
};
