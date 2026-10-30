import { MERCHANT_POOL, MerchantPoolKey } from './catalog';
import { fingerprint } from './MerchantSpec';
import { ManifestMerchant, MerchantPoolManifest } from './manifest';

/** A merchant handed out by the pool. Same shape as configMerchant.basicSetup, plus its processors. */
export interface PooledMerchant {
  merchantId: string;
  merchantName: string;
  merchantToken: string;
  privateKey: string;
  publicKey: string;
  processorIds: string[];
  /** `manifest`: provisioned by CI and shared across workers. `worker`: provisioned by this worker. */
  source: 'manifest' | 'worker';
}

export interface MerchantPoolDeps {
  manifest?: MerchantPoolManifest;
  provision: (key: MerchantPoolKey) => Promise<ManifestMerchant>;
  snapshot: (merchantId: string, merchantToken: string) => Promise<string>;
  adminToken: () => Promise<string>;
  /** Deletes the processors of a merchant this worker provisioned (releaseProcessorsAfterRun). */
  release?: (
    merchant: ManifestMerchant,
    token: string
  ) => Promise<{ released: string[]; failed: string[] }>;
}

/**
 * Replica for a spec file. By file rather than by worker: specs of one folder land in few shards,
 * so a worker-based seed piled them on one replica (10/4/2 in run 36635662176). Deterministic, so
 * a failure always points at the same merchant.
 */
export function replicaIndex(owner: string, replicas: number): number {
  let hash = 0;
  for (const char of owner) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % replicas;
}

interface Held {
  key: MerchantPoolKey;
  merchant: ManifestMerchant;
  source: PooledMerchant['source'];
  owners: Set<string>;
}

/**
 * Hands out merchants by MerchantSpec so specs that need the same setup stop creating their own.
 * One instance per worker process (getMerchantPool); workers run their tests one at a time, so a
 * merchant provisioned by a worker is never used by two tests at once.
 */
export class MerchantPool {
  private readonly provisioned = new Map<string, Promise<ManifestMerchant>>();
  private readonly held = new Map<string, Held>();
  private readonly tainted = new Set<string>();
  /** Every merchant this worker provisioned, tainted ones included: all must be released. */
  private readonly provisionedByWorker: { key: MerchantPoolKey; merchant: ManifestMerchant }[] = [];

  constructor(private readonly deps: MerchantPoolDeps) {}

  /**
   * @param owner identifies who uses the merchant (the spec file); verify(owner) checks the
   *   merchants that owner acquired.
   */
  async acquire(key: MerchantPoolKey, owner: string): Promise<PooledMerchant> {
    const { merchant, source } = (await this.fromManifest(key, owner)) ?? {
      merchant: await this.fromWorker(key),
      source: 'worker' as const,
    };

    const held = this.held.get(merchant.merchantId) ?? {
      key,
      merchant,
      source,
      owners: new Set<string>(),
    };
    held.owners.add(owner);
    this.held.set(merchant.merchantId, held);

    console.log(
      `[merchant-pool] ${JSON.stringify({ key, source, merchantId: merchant.merchantId, owner })}`
    );
    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      merchantToken: await this.deps.adminToken(),
      privateKey: merchant.privateKey,
      publicKey: merchant.publicKey,
      processorIds: [...merchant.processorIds],
      source,
    };
  }

  /**
   * Fails when a merchant this owner acquired no longer has the processors it was provisioned
   * with, and takes that merchant out of the pool so later tests of this worker get a fresh one.
   */
  async verify(owner: string): Promise<void> {
    const mine = [...this.held].filter(([, held]) => held.owners.has(owner));
    // Runs after every test, most of which never touch the pool: no login for those.
    if (!mine.length) return;
    const token = await this.deps.adminToken();
    const broken: string[] = [];
    for (const [merchantId, held] of mine) {
      const current = await this.deps.snapshot(merchantId, token);
      if (current === held.merchant.processorsSnapshot) continue;
      this.tainted.add(merchantId);
      this.held.delete(merchantId);
      this.provisioned.delete(fingerprint(MERCHANT_POOL[held.key]));
      broken.push(`${held.key} (merchant ${merchantId}, ${held.source})`);
    }
    if (broken.length) {
      throw new Error(
        `[merchant-pool] ${owner} changed the processors of a shared merchant: ${broken.join(', ')}. ` +
          'A spec that modifies merchant configuration must create its own merchant with ' +
          'configMerchant.basicSetup instead of using the pool (see docs/merchant-pool-plan.md).'
      );
    }
  }

  /**
   * Called once when the worker ends: deletes the processors of the merchants it provisioned whose
   * spec holds a scarce external resource (PayPal webhooks). Manifest merchants are shared by every
   * worker of the run, so CI releases those instead (cli/release.ts). Returns the processors that
   * could not be deleted; globalTeardown retries them through the ProcessorRegistry.
   */
  async releaseWorkerProvisioned(): Promise<string[]> {
    const toRelease = this.provisionedByWorker.filter(
      ({ key }) =>
        (MERCHANT_POOL[key] as { releaseProcessorsAfterRun?: boolean }).releaseProcessorsAfterRun
    );
    if (!toRelease.length || !this.deps.release) return [];
    const token = await this.deps.adminToken();
    const failed: string[] = [];
    for (const { key, merchant } of toRelease) {
      const result = await this.deps.release(merchant, token);
      failed.push(...result.failed);
      console.log(
        `[merchant-pool] ${JSON.stringify({ released: key, merchantId: merchant.merchantId, processors: result.released.length, failed: result.failed.length })}`
      );
    }
    this.provisionedByWorker.length = 0;
    return failed;
  }

  private async fromManifest(
    key: MerchantPoolKey,
    owner: string
  ): Promise<{ merchant: ManifestMerchant; source: 'manifest' } | undefined> {
    const entry = this.deps.manifest?.entries[key];
    if (!entry) return undefined;
    if (entry.fingerprint !== fingerprint(MERCHANT_POOL[key])) {
      console.warn(
        `[merchant-pool] manifest entry ${key} was provisioned for another definition of the spec; ` +
          'provisioning one for this worker instead'
      );
      return undefined;
    }
    const usable = entry.replicas.filter((m) => !this.tainted.has(m.merchantId));
    if (!usable.length) return undefined;
    return { merchant: usable[replicaIndex(owner, usable.length)], source: 'manifest' };
  }

  private fromWorker(key: MerchantPoolKey): Promise<ManifestMerchant> {
    const id = fingerprint(MERCHANT_POOL[key]);
    let pending = this.provisioned.get(id);
    if (!pending) {
      pending = this.deps.provision(key);
      pending.then(
        (merchant) => this.provisionedByWorker.push({ key, merchant }),
        () => undefined
      );
      this.provisioned.set(id, pending);
      // A failed provisioning is not cached: the next test retries it.
      pending.catch(() => this.provisioned.delete(id));
    }
    return pending;
  }
}
