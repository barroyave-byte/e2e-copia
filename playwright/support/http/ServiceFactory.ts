import { BaseHttpClient, HttpClientConfig } from './BaseHttpClient';
import { BaseService } from './services/BaseService';
import { ServiceRegistry } from './ServiceRegistry';
import { ServiceKey, ServiceFromKey } from './types/ServiceTypes';
import envConfig from '@support/envConfig';

// Import services to trigger decorator registration
import './services';

export class ServiceFactory {
  private static httpClients = new Map<string, BaseHttpClient>();
  private static services = new Map<string, BaseService>();
  private static readonly DEFAULT_BASE_URL = envConfig.BASE_URL_POSTMAN;

  /**
   * Get or create an HttpClient for a specific baseUrl
   * @param baseUrl - Optional baseUrl. Defaults to envConfig.BASE_URL_POSTMAN
   */
  private static getHttpClient(baseUrl: string = ServiceFactory.DEFAULT_BASE_URL): BaseHttpClient {
    if (!ServiceFactory.httpClients.has(baseUrl)) {
      const config: HttpClientConfig = {
        baseUrl,
        timeout: 60000,
        retryAttempts: 3,
        retryDelay: 1000,
        defaultHeaders: {
          'Content-Type': 'application/json',
        },
      };
      ServiceFactory.httpClients.set(baseUrl, new BaseHttpClient(config));
    }
    return ServiceFactory.httpClients.get(baseUrl)!;
  }

  /**
   * Generate a unique cache key for service instances
   */
  private static getServiceCacheKey(serviceKey: ServiceKey, baseUrl: string): string {
    return `${serviceKey}::${baseUrl}`;
  }

  /**
   * Get a service instance by key
   * Services are auto-registered via decorators when imported
   * @param serviceKey - The service key to retrieve
   * @param baseUrl - Optional baseUrl. Defaults to envConfig.BASE_URL_POSTMAN
   */
  static getService<K extends ServiceKey>(
    serviceKey: K,
    baseUrl?: string
  ): ServiceFromKey<K> {
    const resolvedBaseUrl = baseUrl || ServiceFactory.DEFAULT_BASE_URL;
    const cacheKey = ServiceFactory.getServiceCacheKey(serviceKey, resolvedBaseUrl);
    
    // Lazy initialization - create service instance if not cached
    let service = ServiceFactory.services.get(cacheKey);
    if (!service) {
      const httpClient = ServiceFactory.getHttpClient(resolvedBaseUrl);
      service = ServiceRegistry.create(serviceKey, httpClient);
      ServiceFactory.services.set(cacheKey, service);
    }
    
    return service as ServiceFromKey<K>;
  }

  /**
   * Check if a service is available
   */
  static hasService(serviceKey: ServiceKey): boolean {
    return ServiceRegistry.isRegistered(serviceKey);
  }

  /**
   * Get all available service keys
   */
  static getAvailableServices(): ServiceKey[] {
    return ServiceRegistry.getRegisteredServices();
  }

  /**
   * Reset all services and httpClients (useful for testing)
   */
  static reset(): void {
    ServiceFactory.services.clear();
    ServiceFactory.httpClients.clear();
  }
}
