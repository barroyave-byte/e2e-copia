import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent } from 'https';
import { randomUUID } from 'crypto';
import { ConcurrencyConfig, defaultConcurrencyConfig } from './config/ConcurrencyConfig';
import {
  computeBackoffDelay,
  isRetryableNetworkError,
  isRetryableStatus,
} from './utils/retryPolicy';

/**
 * Configuration for HTTP request/response logging
 */
export interface LoggingConfig {
  /** Enable/disable request logging */
  logRequest?: boolean;
  /** Enable/disable response logging */
  logResponse?: boolean;
  /** Enable/disable headers logging */
  logHeaders?: boolean;
  /** Enable/disable request/response body/data logging */
  logData?: boolean;
}

/**
 * Default logging configuration - logs everything
 */
export const defaultLoggingConfig: LoggingConfig = {
  logRequest: true,
  logResponse: true,
  logHeaders: true,
  logData: true,
};

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  concurrency?: ConcurrencyConfig;
  logging?: LoggingConfig;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  pathParams?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'api-key';
    token?: string;
    apiKey?: string;
  };
  /**
   * Set to true when testing error scenarios.
   * Instead of throwing an exception, returns the error response.
   */
  expectError?: boolean;
  /**
   * Override logging configuration for this specific request.
   * If not provided, uses the global logging configuration from HttpClientConfig.
   */
  logging?: LoggingConfig;
  /**
   * Statuses that trigger a retry for this request. Defaults to DEFAULT_RETRY_STATUSES.
   * Narrow it for non-idempotent writes (see SAFE_RETRY_STATUSES_FOR_CREATE), where
   * resending after a 504 can create a duplicate resource.
   */
  retryOn?: readonly number[];
  /**
   * Also retry when no response arrived (connection reset, refused, timeout). Only for requests
   * that are safe to resend, such as a login: the server may have processed the first one.
   */
  retryOnNoResponse?: boolean;
  /** Per-request timeout in ms. Defaults to the client's timeout (60s from ServiceFactory). */
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  description: string;
  status: number;
  url?: string;
  data?: any;
}

export class BaseHttpClient {
  private axiosInstance: AxiosInstance;
  private config: HttpClientConfig;

  /** The base URL this client talks to: identifies the environment of what it fetches. */
  get baseUrl(): string {
    return this.config.baseUrl;
  }
  private defaultLogging: LoggingConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
    this.defaultLogging = { ...defaultLoggingConfig, ...config.logging };
    const concurrencyConfig = config.concurrency || defaultConcurrencyConfig;

    // Create HTTP/HTTPS agent with connection pooling
    const httpsAgent = new Agent({
      keepAlive: concurrencyConfig.keepAlive,
      keepAliveMsecs: concurrencyConfig.keepAliveMsecs,
      maxSockets: concurrencyConfig.maxSockets,
      maxFreeSockets: concurrencyConfig.maxFreeSockets,
    });
    // Axios attaches error listeners per-request to reused keep-alive sockets;
    // disable the limit to suppress the false-positive MaxListenersExceededWarning.
    httpsAgent.setMaxListeners(0);

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || concurrencyConfig.timeout,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = randomUUID();
        config.headers['X-Request-Id'] = requestId;

        // Get logging config from request metadata or use default
        const loggingConfig = (config as any).__loggingConfig || this.defaultLogging;

        if (loggingConfig.logRequest) {
          const logData: any = { requestId };

          if (loggingConfig.logHeaders) {
            logData.headers = config.headers;
          }

          if (loggingConfig.logData && config.data) {
            logData.data = config.data;
          }

          console.log(
            `[HTTP Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
            JSON.stringify(logData, null, 2)
          );
          console.log();
        }

        return config;
      },
      (error) => {
        console.error('[HTTP Request Error]', JSON.stringify(error, null, 2));
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Get logging config from request metadata or use default
        const loggingConfig = (response.config as any).__loggingConfig || this.defaultLogging;

        if (loggingConfig.logResponse) {
          const logData: any = { status: response.status };

          if (loggingConfig.logData) {
            logData.data = response.data;
          }

          console.log(
            `[HTTP Response] ${response.status} ${response.config.baseURL}${response.config.url}`,
            JSON.stringify(logData, null, 2)
          );
          console.log();
        }

        return response;
      },
      async (error) => {
        // Get logging config from request metadata or use default
        const loggingConfig = (error.config as any)?.__loggingConfig || this.defaultLogging;

        if (loggingConfig.logResponse) {
          const sentHeaders = error.config?.headers;
          const logData: any = {
            // requestId permite casar este error con su [HTTP Request] exacto.
            // Sin esto es imposible saber qué intento (poll/retry) falló realmente.
            requestId: sentHeaders?.['X-Request-Id'] ?? sentHeaders?.['x-request-id'],
            status: error.response?.status,
            // Without a status, the code tells a timeout (ECONNABORTED) from a dropped connection.
            errorCode: error.response ? undefined : error.code,
            url: error.config?.url,
            // Evidencia directa de si el header de merchant viajó en el request que falló.
            sentMerchantIdHeader:
              sentHeaders?.['X-Merchant-Id'] ?? sentHeaders?.['x-merchant-id'] ?? null,
          };

          if (loggingConfig.logData) {
            logData.data = error.response?.data;
          }

          console.error('[HTTP Response Error]', JSON.stringify(logData, null, 2));
        }

        // Retry logic for specific status codes. retryRequest enforces the attempt cap;
        // guarding on __retryCount here as well used to cap every request at one retry.
        if (this.shouldRetry(error) && error.config) {
          return this.retryRequest(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return error.config?.__retryOnNoResponse === true && isRetryableNetworkError(error.code);
    }
    return isRetryableStatus(error.response.status, error.config?.__retryOn);
  }

  private async retryRequest(error: any): Promise<AxiosResponse> {
    const config = error.config;
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= (this.config.retryAttempts || 3)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = computeBackoffDelay(config.__retryCount, this.config.retryDelay || 1000);

    console.log(
      `[HTTP Retry] Attempt ${config.__retryCount} after ${delay}ms (${error.response ? `status ${error.response.status}` : `no response ${error.code}`}, ${config.method?.toUpperCase()} ${config.url})`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return this.axiosInstance(config);
  }

  async request<T = any>(requestConfig: RequestConfig): Promise<ApiResponse<T>> {
    try {
      // Replace path parameters
      let url = requestConfig.url;
      if (requestConfig.pathParams) {
        Object.entries(requestConfig.pathParams).forEach(([key, value]) => {
          url = url.replace(`{${key}}`, encodeURIComponent(value));
        });
      }

      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: requestConfig.method,
        url,
        data: requestConfig.data,
        params: requestConfig.params,
        headers: { ...requestConfig.headers },
        ...(requestConfig.timeout !== undefined && { timeout: requestConfig.timeout }),
      };

      // Attach logging config to request metadata
      // This will be read by interceptors
      const loggingConfig = requestConfig.logging
        ? { ...this.defaultLogging, ...requestConfig.logging }
        : this.defaultLogging;
      (axiosConfig as any).__loggingConfig = loggingConfig;
      (axiosConfig as any).__retryOn = requestConfig.retryOn;
      (axiosConfig as any).__retryOnNoResponse = requestConfig.retryOnNoResponse;

      // Handle authentication
      if (requestConfig.auth) {
        if (requestConfig.auth.type === 'bearer' && requestConfig.auth.token) {
          axiosConfig.headers!['Authorization'] = `Bearer ${requestConfig.auth.token}`;
        } else if (requestConfig.auth.type === 'api-key' && requestConfig.auth.apiKey) {
          axiosConfig.headers!['X-Api-Key'] = requestConfig.auth.apiKey;
        }
      }

      const response = await this.axiosInstance.request(axiosConfig);

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      if (requestConfig.expectError && error.response) {
        return {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as Record<string, string>,
        };
      }

      if (error.response) {
        const data = error.response.data;
        const apiError: ApiError = {
          code: data?.code || data?.error?.code || 'UNKNOWN_ERROR',
          description:
            data?.description || data?.message || data?.error?.description || error.message,
          status: error.response.status,
          url: error.config?.url,
          data,
        };
        throw apiError;
      } else if (error.request) {
        // Request was made but no response received
        throw {
          code: 'NETWORK_ERROR',
          description: 'No response received from server',
          status: 0,
        } as ApiError;
      } else {
        // Something else happened
        throw {
          code: 'REQUEST_ERROR',
          description: error.message,
          status: 0,
        } as ApiError;
      }
    }
  }
}
