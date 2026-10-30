import { ServiceRegistry } from '../ServiceRegistry';
import { BaseService } from '../services/BaseService';
import { BaseHttpClient } from '../BaseHttpClient';
import { ServiceKey } from '../types/ServiceTypes';

// Type for service constructors
type ServiceConstructor<T extends BaseService = BaseService> = new (httpClient: BaseHttpClient) => T;

/**
 * Decorator to automatically register services
 * Usage: @RegisterService(SERVICE_KEYS.USER_AUTH)
 */
export function RegisterService(serviceKey: ServiceKey) {
  return function <T extends ServiceConstructor>(constructor: T) {
    // Register the service automatically when the class is defined
    ServiceRegistry.register(serviceKey, constructor);
    
    // Add metadata to the class for debugging
    (constructor as any).serviceKey = serviceKey;
    (constructor as any).isRegistered = true;
    
    return constructor;
  };
}

/**
 * Get service key from decorated class
 */
export function getServiceKey(serviceClass: ServiceConstructor): ServiceKey | undefined {
  return (serviceClass as any).serviceKey;
}

/**
 * Check if a class is registered as a service
 */
export function isServiceRegistered(serviceClass: ServiceConstructor): boolean {
  return !!(serviceClass as any).isRegistered;
}
