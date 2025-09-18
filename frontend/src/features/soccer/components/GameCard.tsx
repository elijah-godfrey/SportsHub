import type { Game } from '@/types/game';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GameCardProps {
    game: Game;
}

export const GameCard = ({ game }: GameCardProps) => {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = () => {
        switch (game.status) {
            case 'SCHEDULED':
                return <Badge variant="secondary">Scheduled</Badge>;
            case 'IN_PROGRESS':
                return <Badge className="bg-green-500 text-white animate-pulse">● LIVE</Badge>;
            case 'FINAL':
                return <Badge variant="outline">Final</Badge>;
            case 'CANCELLED':
                return <Badge variant="destructive">Cancelled</Badge>;
            case 'DELAYED':
                return <Badge className="bg-yellow-500 text-white">Delayed</Badge>;
            default:
                return <Badge variant="secondary">{game.status}</Badge>;
        }
    };

    const isLive = game.status === 'IN_PROGRESS';

    return (
        <Card className={`w-full transition-all duration-200 ${isLive ? 'ring-2 ring-green-500 shadow-lg' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {formatDate(game.startTime)} • {formatTime(game.startTime)}
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Teams and Score */}
                <div className="space-y-3">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {game.homeTeam.shortName?.[0] || game.homeTeam.name[0]}
                            </div>
                            <span className="font-medium">{game.homeTeam.name}</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {game.score?.home ?? '−'}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {game.awayTeam.shortName?.[0] || game.awayTeam.name[0]}
                            </div>
                            <span className="font-medium">{game.awayTeam.name}</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {game.score?.away ?? '−'}
                        </div>
                    </div>
                </div>

                {/* Match Info */}
                {isLive && (game.period || game.clock) && (
                    <div className="flex items-center justify-center space-x-2 pt-2 border-t">
                        {game.period && (
                            <span className="text-sm font-medium">
                                {game.period === 1 ? '1st Half' : game.period === 2 ? '2nd Half' : `Period ${game.period}`}
                            </span>
                        )}
                        {game.clock && (
                            <span className="text-sm text-muted-foreground">
                                • {game.clock}
                            </span>
                        )}
                    </div>
                )}

                {game.venue && (
                    <div className="text-sm text-muted-foreground text-center pt-2 border-t">
                        📍 {game.venue}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
