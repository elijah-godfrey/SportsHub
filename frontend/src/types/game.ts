export interface Team {
    id: string;
    name: string;
    shortName?: string;
}

export interface GameScore {
    home: number;
    away: number;
}

export interface Game {
    id: string;
    homeTeam: Team;
    awayTeam: Team;
    startTime: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' | 'CANCELLED' | 'DELAYED';
    period?: number;
    clock?: string;
    venue?: string;
    score?: GameScore;
}

export interface GamesResponse {
    success: boolean;
    data: Game[];
    count: number;
    breakdown?: {
        upcoming: number;
        live: number;
    };
    message?: string;
}

export interface GameUpdateEvent {
    id: string;
    homeTeam: string;
    awayTeam: string;
    score?: GameScore;
    status: string;
    period?: number;
    clock?: string;
    updatedAt: string;
}
