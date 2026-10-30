import { test as base } from './services';
import { getMerchantPool, type MerchantPoolKey, type PooledMerchant } from '@support/merchantPool';
import { setFreshMerchantShard } from '@support/merchantPool/fresh';

export interface MerchantPoolFixture {
  /** Returns the pooled merchant for a catalog entry (MERCHANT_POOL). Usable in beforeAll. */
  acquire(key: MerchantPoolKey): Promise<PooledMerchant>;
}

interface MerchantPoolWorkerFixtures {
  merchantPool: MerchantPoolFixture;
}

interface MerchantPoolTestFixtures {
  _merchantPoolIntegrity: void;
}

/**
 * Worker-scoped so specs can acquire their merchant in beforeAll, where test-scoped fixtures
 * are not available. After every test, the integrity check fails the test if it changed the
 * processors of a merchant it got from the pool.
 */
export const test = base.extend<MerchantPoolTestFixtures, MerchantPoolWorkerFixtures>({
  merchantPool: [
    async ({}, use, workerInfo) => {
      setFreshMerchantShard(workerInfo.config.shard?.current);
      const pool = getMerchantPool();
      await use({ acquire: (key) => pool.acquire(key, base.info().file) });
      // Frees what this worker holds on external quotas (PayPal webhooks). A failure here must not
      // fail the worker: globalTeardown retries the processors through the ProcessorRegistry.
      const leftovers = await pool.releaseWorkerProvisioned().catch((error) => {
        console.error(`[merchant-pool] releasing worker processors failed: ${error}`);
        return [] as string[];
      });
      if (leftovers.length) {
        console.error(
          `[merchant-pool] processors left for globalTeardown: ${leftovers.join(', ')}`
        );
      }
    },
    { scope: 'worker', auto: true },
  ],
  _merchantPoolIntegrity: [
    async ({}, use, testInfo) => {
      await use(undefined);
      await getMerchantPool().verify(testInfo.file);
    },
    { auto: true },
  ],
});
