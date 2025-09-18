export interface GameData {
    id: string;
    homeTeam: TeamData;
    awayTeam: TeamData;
    startTime: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' | 'CANCELLED' | 'DELAYED';
    period?: number;
    clock?: string;
    venue?: string;
    league?: string;
    externalId: string;
    score?: {
        home: number;
        away: number;
    };
}

export interface TeamData {
    name: string;
    shortName?: string;
    externalId: string;
}

export interface AdapterResponse<T = GameData[]> {
    success: boolean;
    data?: T;
    error?: string;
    rateLimit?: {
        remaining: number;
        resetTime: number;
    };
}
