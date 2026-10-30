// Usage: npm run merchant-pool:provision -- \
//          --out merchant-pool.json [--keys MX_STRIPE,... | --no-shared] [--concurrency 8]
//          [--fresh-shards 80 --grep '@regression(?![\w-])' [--grep-invert ...] [--spare-ratio 0.05]]
//          [--deadline 360]
//
// Runs once, before the shard matrix, and writes the manifest the shards read through
// MERCHANT_POOL_MANIFEST (docs/merchant-pool-plan.md, sections 4 and 4.6):
//
// - Shared merchants: every MERCHANT_POOL entry, all its replicas.
// - With --fresh-shards: one single-use plain merchant per spec of each shard, sized from each
//   shard's --list and the specs' static demand, plus a margin. createBasicMerchant claims them
//   instead of creating merchants when the shards start, which is the burst merchant-auth fails on.
//
// Creation runs with adaptive concurrency (default 8, halved on failures). The manifest holds
// merchant private keys: never print it, and store it only where the workflow keeps secrets.
import envConfig from '@support/envConfig';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import {
  fingerprint,
  isMerchantPoolKey,
  MERCHANT_POOL,
  MerchantPoolKey,
} from '@support/merchantPool';
import { merchantDemand } from '@support/merchantPool/demand';
import type { FreshMerchant } from '@support/merchantPool/fresh';
import { MANIFEST_VERSION, ManifestMerchant, writeManifest } from '@support/merchantPool/manifest';
import { provisionMerchant } from '@support/merchantPool/provision';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { DEADLINE, runAdaptive } from '../lib/adaptive';
import { allFiles, filesByShard, Selection } from '../lib/shards';
import { distribute, distributeEvenly, planStock, totalsByCountry } from '../lib/stock';
import { MERCHANT_POOL_SETTINGS } from '../config';

const TEST_DIR = 'playwright/tests';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const log = (message: string) => console.log(`[merchant-pool] ${message}`);
const onLimitChange = (what: string) => (limit: number, reason: string) =>
  log(`${what}: concurrency -> ${limit} (${reason})`);

/**
 * The shards wait for this job, so it must end in bounded time even when staging is degraded
 * (60s per request plus retries would otherwise run to the job timeout). At `stopAt` nothing new
 * starts and the --list runs are killed; at `giveUpAt` requests still in flight are abandoned.
 * Whatever was created by then goes into the manifest, and the shards create the rest on the spot.
 */
interface Budget {
  stopAt: number;
  giveUpAt: number;
  signal: AbortSignal;
}

async function provisionShared(keys: MerchantPoolKey[], concurrency: number, budget: Budget) {
  const jobs = keys.flatMap((key) =>
    Array.from({ length: MERCHANT_POOL[key].replicas ?? 1 }, () => key)
  );
  const results = await runAdaptive(
    jobs.map((key) => () => provisionMerchant(MERCHANT_POOL[key])),
    {
      initial: concurrency,
      onLimitChange: onLimitChange('shared'),
      stopStartingAt: budget.stopAt,
      giveUpAt: budget.giveUpAt,
    }
  );
  const entries: Record<string, { fingerprint: string; replicas: ManifestMerchant[] }> = {};
  let failures = 0;
  results.forEach((result, index) => {
    const key = jobs[index];
    entries[key] ??= { fingerprint: fingerprint(MERCHANT_POOL[key]), replicas: [] };
    if (result.status === 'fulfilled') entries[key].replicas.push(result.value);
    else {
      failures += 1;
      console.error(`[merchant-pool] ${key}: provisioning failed: ${result.reason}`);
    }
  });
  for (const key of Object.keys(entries)) if (!entries[key].replicas.length) delete entries[key];
  for (const [key, entry] of Object.entries(entries)) {
    log(`${key}: ${entry.replicas.map((m) => m.merchantId).join(', ')}`); // ids only
  }
  log(`shared: ${jobs.length - failures}/${jobs.length} provisioned`);
  return entries;
}

async function createFresh(totals: Record<string, number>, concurrency: number, budget: Budget) {
  const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
  const jobs = Object.entries(totals).flatMap(([country, n]) =>
    Array.from({ length: n }, () => country)
  );
  const startedAt = Date.now();
  const results = await runAdaptive(
    jobs.map((country) => async () => {
      const m = await merchantAuthService.createBasicMerchant({ country: country as CountryCodes });
      const fresh: FreshMerchant = {
        merchantId: m.merchantId,
        merchantName: m.merchantName,
        privateKey: m.privateKey,
        publicKey: m.publicKey,
      };
      return fresh;
    }),
    {
      initial: concurrency,
      onLimitChange: onLimitChange('fresh'),
      stopStartingAt: budget.stopAt,
      giveUpAt: budget.giveUpAt,
    }
  );
  const created: Record<string, FreshMerchant[]> = {};
  let failures = 0;
  let cut = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') (created[jobs[index]] ??= []).push(result.value);
    else if ((result.reason as Error)?.message === DEADLINE) cut += 1;
    else failures += 1;
  });
  if (cut) log(`fresh: ${cut} not created, deadline reached; the shards create them on the spot`);
  const secs = (Date.now() - startedAt) / 1000;
  log(
    `fresh: ${jobs.length - failures - cut}/${jobs.length} created in ${secs.toFixed(0)}s ` +
      `(${Math.round(((jobs.length - failures - cut) / Math.max(secs, 1)) * 60)}/min)`
  );
  return created;
}

async function main() {
  const out = arg('out');
  if (!out) throw new Error('--out <path> is required');
  // 8 at a time spreads the ~2000 single-use merchants over the ~70s the per-shard lists take
  // anyway: same job duration, a third of the rate merchant-auth saw at 20 (3800 per minute).
  const concurrency = Number(arg('concurrency') ?? 8);
  const requested =
    arg('keys')
      ?.split(',')
      .map((k) => k.trim()) ?? Object.keys(MERCHANT_POOL);
  const unknown = requested.filter((k) => !isMerchantPoolKey(k));
  if (unknown.length) throw new Error(`Unknown MERCHANT_POOL keys: ${unknown.join(', ')}`);
  // Off in config.ts, or --no-shared (what older workflows pass to mean "stock only").
  const shared = MERCHANT_POOL_SETTINGS.shared && !process.argv.includes('--no-shared');
  const keys = shared ? (requested as MerchantPoolKey[]) : [];

  const freshShards =
    MERCHANT_POOL_SETTINGS.presupply && arg('fresh-shards')
      ? Number(arg('fresh-shards'))
      : undefined;
  const selection: Selection = { grep: arg('grep'), grepInvert: arg('grep-invert') };
  // Measured on run 37725483883: 172 merchants were missing and created on the spot, 135 unused
  // besides fixme files. 5% plus one MX spare per shard; what is missing is still created on the
  // spot, as before the stock existed.
  const spareRatio = Number(arg('spare-ratio') ?? 0.05);
  const demandOf = (file: string) => merchantDemand(`${TEST_DIR}/${file}`);

  const deadlineSecs = Number(arg('deadline') ?? 360);
  const controller = new AbortController();
  const startedAt = Date.now();
  const budget: Budget = {
    stopAt: startedAt + deadlineSecs * 1000,
    giveUpAt: startedAt + (deadlineSecs + 30) * 1000,
    signal: controller.signal,
  };
  setTimeout(() => {
    log(`deadline of ${deadlineSecs}s reached: no new merchants, listings stopped`);
    controller.abort();
  }, deadlineSecs * 1000).unref();
  const unlessAborted = <T>(work: Promise<T>, what: string) =>
    work.catch((error) => {
      if (!controller.signal.aborted) throw error;
      log(`${what} did not finish before the deadline`);
      return undefined;
    });

  log(
    `provisioning on ${envConfig.NODE_ENV}, up to ${concurrency} at a time ` +
      `(shared ${shared ? 'on' : 'off'}, presupply ${freshShards ? 'on' : 'off'}; scripts/merchant-pool/config.ts)`
  );
  // One creation phase at a time, so merchant-auth never sees more than `concurrency`; each one
  // overlaps a --list, which is local CPU work.
  const [entries, files] = await Promise.all([
    provisionShared(keys, concurrency, budget),
    freshShards
      ? unlessAborted(allFiles(selection, budget.signal), 'the full --list')
      : Promise.resolve([] as string[]),
  ]);

  let fresh: Record<string, Record<string, FreshMerchant[]>> | undefined;
  if (freshShards && files) {
    // Size the stock from the full list and create it while the per-shard lists (the slow part)
    // decide which shard gets which merchant.
    const estimate = totalsByCountry(planStock(new Map([[0, files]]), demandOf, spareRatio));
    estimate.MX = (estimate.MX ?? 0) + freshShards; // the per-shard MX spare
    log(`fresh: ${files.length} spec files, creating ${JSON.stringify(estimate)}`);
    const [created, byShard] = await Promise.all([
      createFresh(estimate, concurrency, budget),
      unlessAborted(
        filesByShard(selection, freshShards, undefined, budget.signal),
        'the per-shard --list'
      ),
    ]);
    if (byShard) fresh = distribute(planStock(byShard, demandOf, spareRatio), created);
    else {
      // The stock exists already: deal it evenly rather than throw it away.
      log('fresh: per-shard lists unavailable, dealing the stock evenly across shards');
      fresh = distributeEvenly(created, freshShards);
    }
  }
  if (fresh) {
    const handedOut = Object.values(fresh).reduce(
      (a, byCountry) => a + Object.values(byCountry).reduce((b, list) => b + list.length, 0),
      0
    );
    log(`fresh: ${handedOut} merchants across ${Object.keys(fresh).length}/${freshShards} shards`);
  } else if (freshShards) {
    log('fresh: no single-use stock this run; the shards create merchants on the spot');
  }

  writeManifest(out, {
    version: MANIFEST_VERSION,
    env: envConfig.NODE_ENV,
    baseUrl: envConfig.BASE_URL_POSTMAN,
    createdAt: new Date().toISOString(),
    entries,
    ...(fresh && { fresh }),
  });
  log(`wrote ${out} in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  // Requests abandoned at the deadline may still hold sockets open: do not wait for them.
  process.exit(0);
}

main().catch((error) => {
  console.error('[merchant-pool] provisioning aborted:', error);
  process.exit(1);
});
