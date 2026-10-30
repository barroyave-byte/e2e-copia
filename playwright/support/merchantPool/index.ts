import envConfig from '@support/envConfig';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { MERCHANT_POOL } from './catalog';
import { loadManifest } from './manifest';
import { MerchantPool } from './MerchantPool';
import { processorsSnapshot, provisionMerchant, releaseProcessors } from './provision';

export { MERCHANT_POOL, isMerchantPoolKey, type MerchantPoolKey } from './catalog';
export { fingerprint, type MerchantSpec } from './MerchantSpec';
export { MerchantPool, replicaIndex, type PooledMerchant } from './MerchantPool';

let pool: MerchantPool | undefined;

/**
 * The pool of this worker process, shared by the merchantPool fixture, the DSL action and scripts.
 */
export function getMerchantPool(): MerchantPool {
  if (!pool) {
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    pool = new MerchantPool({
      manifest: loadManifest({ env: envConfig.NODE_ENV, baseUrl: envConfig.BASE_URL_POSTMAN }),
      provision: (key) => provisionMerchant(MERCHANT_POOL[key], { registerForCleanup: true }),
      release: releaseProcessors,
      snapshot: processorsSnapshot,
      adminToken: () => merchantAuthService.getAdminAccessToken(),
    });
  }
  return pool;
}
