import envConfig, { allowedEnvironments } from '@support/envConfig';
import { merchantIDByEnviroment } from '../constants/commons';

/**
 * Configuration for merchant IDs by environment
 */
interface MerchantIdConfig {
  production: string;
  staging: string;
  default: string;
}

/**
 * Gets the default merchant ID based on the current environment
 * Uses the predefined merchantIDByEnviroment mapping
 * @returns The default merchant ID for the current environment
 */
export const getDefaultMerchant = (): string => {
  return (
    merchantIDByEnviroment[envConfig.NODE_ENV] ??
    merchantIDByEnviroment[allowedEnvironments.PRODUCTION]
  );
};

/**
 * Gets the appropriate merchant ID based on the current environment
 * @param config - Configuration object with merchant IDs for different environments
 * @returns The merchant ID for the current environment
 *
 * @example
 * ```typescript
 * const merchantId = getMerchantByConfig({
 *   production: '3e2bb759-70b1-413d-b3c4-d8a38cea5b42',
 *   staging: '3cfc0f50-06df-45e5-ace8-ad4e49191c71',
 *   default: '8dbe50ba-529d-4c74-8c72-e713ec9c79e0'
 * });
 * ```
 */
export function getMerchantByConfig(config: MerchantIdConfig): string {
  if (envConfig.NODE_ENV === allowedEnvironments.PRODUCTION) {
    return config.production;
  }

  if (envConfig.NODE_ENV === allowedEnvironments.STAGING) {
    return config.staging;
  }

  return config.default;
}
