import { SportAdapter } from '../base/SportAdapter.js';
import { AdapterResponse, GameData } from '../../types/game.js';

interface FootballDataTeam {
    id: number;
    name: string;
    shortName: string;
    tla: string; // Three Letter Abbreviation
    crest: string;
}

interface FootballDataMatch {
    id: number;
    utcDate: string;
    status: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
    minute: number | null;
    score: {
        winner: string | null;
        duration: string;
        fullTime: {
            home: number | null;
            away: number | null;
        };
        halfTime: {
            home: number | null;
            away: number | null;
        };
    };
    homeTeam: FootballDataTeam;
    awayTeam: FootballDataTeam;
    venue?: string;
}

interface FootballDataResponse {
    matches: FootballDataMatch[];
    count: number;
}

export class FootballDataAdapter extends SportAdapter {
    readonly sport = 'soccer';
    readonly league = 'Premier League';
    private readonly baseUrl = 'https://api.football-data.org/v4';
    private readonly competitionId = 2021; // Premier League
    private readonly apiKey: string;

    constructor() {
        super();
        this.apiKey = process.env.FOOTBALL_DATA_API_KEY || '';
        if (!this.apiKey) {
            console.warn('FOOTBALL_DATA_API_KEY not set. Adapter will return mock data.');
        }
    }

    /**
     * Fetch today's scheduled games
     */
    async fetchTodaysGames(): Promise<AdapterResponse<GameData[]>> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const url = `${this.baseUrl}/competitions/${this.competitionId}/matches?dateFrom=${today}&dateTo=${today}`;

            const response = await this.makeRequest(url);

            if (!response.success || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Failed to fetch data',
                };
            }

            const games = response.data.matches.map(match => this.transformMatch(match));

            return {
                success: true,
                data: games,
                rateLimit: response.rateLimit,
            };
        } catch (error) {
            console.error('Error fetching today\'s games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Fetch live games with current scores
     */
    async fetchLiveGames(): Promise<AdapterResponse<GameData[]>> {
        try {
            const url = `${this.baseUrl}/competitions/${this.competitionId}/matches?status=LIVE,IN_PLAY,PAUSED`;

            const response = await this.makeRequest(url);

            if (!response.success || !response.data) {
                return {
                    success: false,
                    error: response.error || 'Failed to fetch data',
                };
            }

            const games = response.data.matches.map(match => this.transformMatch(match));

            return {
                success: true,
                data: games,
                rateLimit: response.rateLimit,
            };
        } catch (error) {
            console.error('Error fetching live games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Make HTTP request to Football-Data.org API
     */
    private async makeRequest(url: string): Promise<AdapterResponse<FootballDataResponse>> {
        if (!this.apiKey) {
            // Return mock data for development
            return this.getMockData();
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'X-Auth-Token': this.apiKey,
                },
            });

            // Extract rate limit info
            const rateLimit = {
                remaining: parseInt(response.headers.get('X-Requests-Available-Minute') || '0'),
                resetTime: Date.now() + 60000, // Reset in 1 minute
            };

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as FootballDataResponse;

            return {
                success: true,
                data,
                rateLimit,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    /**
     * Transform Football-Data.org match to our GameData format
     */
    private transformMatch(match: FootballDataMatch): GameData {
        // Map Football-Data status to our status
        let status: GameData['status'];
        switch (match.status) {
            case 'SCHEDULED':
                status = 'SCHEDULED';
                break;
            case 'LIVE':
            case 'IN_PLAY':
            case 'PAUSED':
                status = 'IN_PROGRESS';
                break;
            case 'FINISHED':
                status = 'FINAL';
                break;
            case 'POSTPONED':
            case 'SUSPENDED':
                status = 'DELAYED';
                break;
            case 'CANCELLED':
                status = 'CANCELLED';
                break;
            default:
                status = 'SCHEDULED';
        }

        return {
            id: `football-data-${match.id}`,
            externalId: match.id.toString(),
            homeTeam: {
                name: match.homeTeam.name,
                shortName: match.homeTeam.shortName || match.homeTeam.tla,
                externalId: match.homeTeam.id.toString(),
            },
            awayTeam: {
                name: match.awayTeam.name,
                shortName: match.awayTeam.shortName || match.awayTeam.tla,
                externalId: match.awayTeam.id.toString(),
            },
            startTime: match.utcDate,
            status,
            period: match.minute ? Math.ceil(match.minute / 45) : undefined,
            clock: match.minute ? `${match.minute}'` : undefined,
            venue: match.venue,
            league: this.league,
            score: match.score.fullTime.home !== null ? {
                home: match.score.fullTime.home,
                away: match.score.fullTime.away || 0,
            } : undefined,
        };
    }

    /**
     * Return mock data for development (when no API key)
     */
    private getMockData(): AdapterResponse<FootballDataResponse> {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
            success: true,
            data: {
                count: 2,
                matches: [
                    {
                        id: 12345,
                        utcDate: today.toISOString(),
                        status: 'SCHEDULED',
                        minute: null,
                        score: {
                            winner: null,
                            duration: 'REGULAR',
                            fullTime: { home: null, away: null },
                            halfTime: { home: null, away: null },
                        },
                        homeTeam: {
                            id: 57,
                            name: 'Arsenal FC',
                            shortName: 'Arsenal',
                            tla: 'ARS',
                            crest: '',
                        },
                        awayTeam: {
                            id: 61,
                            name: 'Chelsea FC',
                            shortName: 'Chelsea',
                            tla: 'CHE',
                            crest: '',
                        },
                        venue: 'Emirates Stadium',
                    },
                    {
                        id: 12346,
                        utcDate: tomorrow.toISOString(),
                        status: 'LIVE',
                        minute: 67,
                        score: {
                            winner: null,
                            duration: 'REGULAR',
                            fullTime: { home: 2, away: 1 },
                            halfTime: { home: 1, away: 0 },
                        },
                        homeTeam: {
                            id: 65,
                            name: 'Manchester City FC',
                            shortName: 'Man City',
                            tla: 'MCI',
                            crest: '',
                        },
                        awayTeam: {
                            id: 66,
                            name: 'Manchester United FC',
                            shortName: 'Man United',
                            tla: 'MUN',
                            crest: '',
                        },
                        venue: 'Etihad Stadium',
                    },
                ],
            },
            rateLimit: {
                remaining: 9,
                resetTime: Date.now() + 60000,
            },
        };
    }
}
