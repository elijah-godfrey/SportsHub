import { apiGet } from '@/lib/api-client';

export interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await apiGet<HealthStatus>('/api/health');
  return response.data;
};

