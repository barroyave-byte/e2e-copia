// Configuration for handling concurrent requests
export interface ConcurrencyConfig {
  maxConcurrentRequests: number;
  connectionPoolSize: number;
  keepAlive: boolean;
  keepAliveMsecs: number;
  maxSockets: number;
  maxFreeSockets: number;
  timeout: number;
  rateLimitConfig?: {
    maxRequestsPerSecond: number;
    burstSize: number;
  };
}

export const defaultConcurrencyConfig: ConcurrencyConfig = {
  // Limit concurrent requests to prevent overwhelming the server
  maxConcurrentRequests: 50,
  
  // HTTP connection pooling
  connectionPoolSize: 20,
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 seconds
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
  
  // Rate limiting (optional)
  rateLimitConfig: {
    maxRequestsPerSecond: 100,
    burstSize: 20
  }
};

export const testEnvironmentConfig: ConcurrencyConfig = {
  ...defaultConcurrencyConfig,
  maxConcurrentRequests: 100, // Higher for test environments
  rateLimitConfig: {
    maxRequestsPerSecond: 200,
    burstSize: 30
  }
};
