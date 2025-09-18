import { useSoccerGames } from '../hooks';
import { GameCard } from './GameCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const SoccerDashboard = () => {
    const { games, loading, error, message } = useSoccerGames();

    if (loading) {
        return (
            <Card className="w-full">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 bg-muted rounded-full animate-pulse"></div>
                        <span className="text-muted-foreground">Loading Premier League games...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full border-destructive">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 bg-destructive rounded-full"></div>
                        <span className="text-destructive">Error: {error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const liveGames = games.filter(game => game.status === 'IN_PROGRESS');
    const upcomingGames = games.filter(game => game.status === 'SCHEDULED');
    const completedGames = games.filter(game => game.status === 'FINAL');

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                            <span>⚽ Premier League</span>
                            {liveGames.length > 0 && (
                                <Badge className="bg-green-500 text-white animate-pulse">
                                    {liveGames.length} LIVE
                                </Badge>
                            )}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                            {message}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Live Games */}
            {liveGames.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <span>🔴 Live Games</span>
                        <Badge className="bg-green-500 text-white">{liveGames.length}</Badge>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {liveGames.map(game => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Games */}
            {upcomingGames.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <span>📅 Upcoming Games</span>
                        <Badge variant="secondary">{upcomingGames.length}</Badge>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingGames.map(game => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Games */}
            {completedGames.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <span>✅ Final Results</span>
                        <Badge variant="outline">{completedGames.length}</Badge>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {completedGames.map(game => (
                            <GameCard key={game.id} game={game} />
                        ))}
                    </div>
                </div>
            )}

            {/* No Games */}
            {games.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <div className="text-4xl mb-4">⚽</div>
                            <p>No Premier League games found.</p>
                            <p className="text-sm mt-2">Check back later for upcoming matches!</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Real-time indicator */}
            <div className="text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Real-time updates enabled</span>
                </div>
            </div>
        </div>
    );
};
