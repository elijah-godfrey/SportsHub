import { useState, useEffect } from 'react';
import { getHealth } from '../api/getHealth';
import type { HealthStatus } from '../api/getHealth';

export const useHealth = () => {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setIsLoading(true);
        const healthData = await getHealth();
        setData(healthData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return { data, isLoading, error };
};

