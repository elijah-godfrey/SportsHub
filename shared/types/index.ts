export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

