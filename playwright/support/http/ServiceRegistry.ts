import { BaseHttpClient } from './BaseHttpClient';
import { BaseService } from './services/BaseService';
import { ServiceKey, ServiceFromKey, isValidServiceKey, SERVICE_KEYS } from './types/ServiceTypes';

// Type for service constructors
type ServiceConstructor<T extends BaseService = BaseService> = new (httpClient: BaseHttpClient) => T;

/**
 * Service Registry for managing service constructors
 * Replaces the need for large switch cases in factories
 */
export class ServiceRegistry {
  private static services = new Map<ServiceKey, ServiceConstructor>();

  /**
   * Register a service class with a key
   */
  static register<T extends BaseService>(key: ServiceKey, serviceClass: ServiceConstructor<T>): void {
    if (!isValidServiceKey(key)) {
      throw new Error(`Invalid service key: ${key}. Must be one of: ${Object.values(SERVICE_KEYS).join(', ')}`);
    }
    ServiceRegistry.services.set(key, serviceClass);
  }

  /**
   * Get a service constructor by key
   */
  static get<T extends BaseService>(key: ServiceKey): ServiceConstructor<T> | undefined {
    return ServiceRegistry.services.get(key) as ServiceConstructor<T>;
  }

  /**
   * Create an instance of a service
   */
  static create<T extends BaseService>(key: ServiceKey, httpClient: BaseHttpClient): T {
    const ServiceClass = ServiceRegistry.get<T>(key);
    if (!ServiceClass) {
      throw new Error(`Service '${key}' not found in registry. Available services: ${Array.from(ServiceRegistry.services.keys()).join(', ')}`);
    }
    return new ServiceClass(httpClient);
  }

  /**
   * Get all registered service keys
   */
  static getRegisteredServices(): ServiceKey[] {
    return Array.from(ServiceRegistry.services.keys());
  }

  /**
   * Check if a service is registered
   */
  static isRegistered(key: ServiceKey): boolean {
    return ServiceRegistry.services.has(key);
  }
}
