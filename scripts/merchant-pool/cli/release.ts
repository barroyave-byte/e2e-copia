// Usage: npm run merchant-pool:release -- --manifest merchant-pool.json
//
// Deletes the processors of the manifest's merchants whose catalog entry is
// releaseProcessorsAfterRun (PayPal: one webhook per processor, 10 per app shared by every
// environment). Runs in CI's cleanup-merchant-pool after the primary run, before the manifest is
// revoked. Workers release the merchants they provisioned themselves on teardown.
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import envConfig from '@support/envConfig';
import { isMerchantPoolKey, MERCHANT_POOL } from '@support/merchantPool';
import { loadManifest } from '@support/merchantPool/manifest';
import { releaseProcessors } from '@support/merchantPool/provision';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

async function main() {
  const path = arg('manifest');
  if (!path) throw new Error('--manifest <path> is required');
  const manifest = loadManifest(
    { env: envConfig.NODE_ENV, baseUrl: envConfig.BASE_URL_POSTMAN },
    path
  );
  if (!manifest) throw new Error(`No manifest at ${path}`);

  const toRelease = Object.entries(manifest.entries).filter(
    ([key]) =>
      isMerchantPoolKey(key) &&
      (MERCHANT_POOL[key] as { releaseProcessorsAfterRun?: boolean }).releaseProcessorsAfterRun
  );
  if (!toRelease.length) {
    console.log('[merchant-pool] nothing to release');
    return;
  }
  const token = await ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH).getAdminAccessToken();
  let failed = 0;
  for (const [key, entry] of toRelease) {
    for (const merchant of entry.replicas) {
      const result = await releaseProcessors(merchant, token);
      failed += result.failed.length;
      // Ids only: the manifest's keys never reach the log.
      console.log(
        `[merchant-pool] ${key} ${merchant.merchantId}: released ${result.released.join(', ') || '-'}` +
          (result.failed.length ? ` | FAILED ${result.failed.join(', ')}` : '')
      );
    }
  }
  if (failed) {
    console.error(`[merchant-pool] ${failed} processor(s) not released`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[merchant-pool] release aborted:', error);
  process.exit(1);
});
