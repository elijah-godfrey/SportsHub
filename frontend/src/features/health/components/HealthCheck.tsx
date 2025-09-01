import { useHealth } from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const HealthCheck = () => {
  const { data: health, isLoading, error } = useHealth();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-muted rounded-full animate-pulse"></div>
            <span className="text-muted-foreground">Checking server health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-destructive rounded-full"></div>
            <span className="text-destructive">Error checking health: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Server Health
          <Badge className={health?.status === 'ok' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
            {health?.status?.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Uptime:</span>
          <span className="font-mono font-medium">
            {health?.uptime ? Math.floor(health.uptime) : 0}s
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Last check:</span>
          <span className="font-mono text-sm">
            {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
          </span>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-muted-foreground">
              {health?.status === 'ok' ? 'All systems operational' : 'System issues detected'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

