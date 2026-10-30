// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/pool.test.ts
//
// Phase 1 of docs/merchant-pool-plan.md: MerchantSpec fingerprint, manifest validation and the
// MerchantPool resolution and integrity rules, with fake dependencies (no network).
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { fingerprint, MERCHANT_POOL, MerchantPool, replicaIndex } from '@support/merchantPool';
import {
  loadManifest,
  MANIFEST_VERSION,
  ManifestMerchant,
  MerchantPoolManifest,
  writeManifest,
} from '@support/merchantPool/manifest';

const merchant = (id: string, snapshot = 'snap-ok'): ManifestMerchant => ({
  merchantId: id,
  merchantName: `name ${id}`,
  privateKey: `priv ${id}`,
  publicKey: `pub ${id}`,
  processorIds: [`proc-${id}`],
  processorsSnapshot: snapshot,
});

function fakePool(options: { manifest?: MerchantPoolManifest; failRelease?: string[] } = {}) {
  const calls = { provision: 0, adminToken: 0 };
  const released: string[] = [];
  const snapshots = new Map<string, string>();
  let failNextProvision = false;
  const pool = new MerchantPool({
    manifest: options.manifest,
    provision: async () => {
      calls.provision += 1;
      if (failNextProvision) {
        failNextProvision = false;
        throw new Error('merchant-auth down');
      }
      return merchant(`w-${calls.provision}`);
    },
    snapshot: async (id) => snapshots.get(id) ?? 'snap-ok',
    adminToken: async () => {
      calls.adminToken += 1;
      return 'admin-token';
    },
    release: async (m) => {
      const failed = m.processorIds.filter((id) => options.failRelease?.includes(id));
      released.push(...m.processorIds.filter((id) => !failed.includes(id)));
      return { released: m.processorIds.filter((id) => !failed.includes(id)), failed };
    },
  });
  return {
    pool,
    calls,
    released,
    snapshots,
    failProvisionOnce: () => {
      failNextProvision = true;
    },
  };
}

async function main() {
  // --- fingerprint: by content, including the whole processor config
  const spec = MERCHANT_POOL.MX_STRIPE;
  assert.strictEqual(
    fingerprint(spec),
    fingerprint({ ...spec, replicas: 99 }),
    'replicas do not matter'
  );
  assert.notStrictEqual(fingerprint(spec), fingerprint({ ...spec, country: 'CO' }));
  assert.notStrictEqual(
    fingerprint(spec),
    fingerprint({ ...spec, processors: [processorsConfig.stripeProcessorAuthorize] }),
    'same processor name, different config'
  );
  assert.strictEqual(
    fingerprint({ ...spec, processors: [{ ...processorsConfig.stripeProcessor }] }),
    fingerprint(spec),
    'key order and object identity do not matter'
  );

  // --- worker source: one provisioning per spec, shared by every owner in the worker
  {
    const { pool, calls } = fakePool();
    const [a, b] = await Promise.all([
      pool.acquire('MX_STRIPE', 'a.spec.ts'),
      pool.acquire('MX_STRIPE', 'b.spec.ts'),
    ]);
    assert.strictEqual(calls.provision, 1, 'concurrent acquires share one provisioning');
    assert.strictEqual(a.merchantId, b.merchantId);
    assert.deepStrictEqual(
      [a.source, a.privateKey, a.publicKey, a.merchantToken],
      ['worker', 'priv w-1', 'pub w-1', 'admin-token'],
      'the key pair travels together with a fresh admin token'
    );
  }

  // --- a failed provisioning is not cached
  {
    const { pool, calls, failProvisionOnce } = fakePool();
    failProvisionOnce();
    await assert.rejects(pool.acquire('MX_STRIPE', 'a.spec.ts'), /merchant-auth down/);
    const m = await pool.acquire('MX_STRIPE', 'a.spec.ts');
    assert.strictEqual(calls.provision, 2);
    assert.strictEqual(m.merchantId, 'w-2');
  }

  // --- manifest source: replicas spread by seed; a stale fingerprint falls back to the worker
  const manifest: MerchantPoolManifest = {
    version: MANIFEST_VERSION,
    env: 'staging',
    baseUrl: 'https://api.example',
    createdAt: new Date().toISOString(),
    entries: {
      MX_STRIPE: {
        fingerprint: fingerprint(spec),
        replicas: [merchant('r-0'), merchant('r-1'), merchant('r-2')],
      },
    },
  };
  {
    const { pool, calls } = fakePool({ manifest });
    const a = await pool.acquire('MX_STRIPE', 'a.spec.ts');
    const again = await pool.acquire('MX_STRIPE', 'a.spec.ts');
    assert.deepStrictEqual(
      [a.source, a.merchantId, calls.provision],
      ['manifest', again.merchantId, 0],
      'same spec, same replica'
    );
  }
  {
    // 300 spec files over 3 replicas: every replica takes a fair share
    const counts = [0, 0, 0];
    for (let i = 0; i < 300; i++)
      counts[replicaIndex(`playwright/tests/PSP/x/PI-T${i}.spec.ts`, 3)]++;
    assert.ok(Math.min(...counts) >= 70, `uneven spread ${counts}`);
  }
  {
    const stale = {
      ...manifest,
      entries: { MX_STRIPE: { ...manifest.entries.MX_STRIPE, fingerprint: 'old' } },
    };
    const { pool, calls } = fakePool({ manifest: stale });
    const m = await pool.acquire('MX_STRIPE', 'a.spec.ts');
    assert.deepStrictEqual([m.source, calls.provision], ['worker', 1], 'stale entry is not used');
  }

  // --- integrity: no holdings, no login; a changed merchant fails the test and leaves the pool
  {
    const { pool, calls, snapshots } = fakePool();
    await pool.verify('nobody.spec.ts');
    assert.strictEqual(calls.adminToken, 0, 'tests that never used the pool trigger no login');

    const first = await pool.acquire('MX_STRIPE', 'bad.spec.ts');
    await pool.verify('bad.spec.ts');
    snapshots.set(first.merchantId, 'snap-changed');
    await pool.verify('other.spec.ts'); // did not acquire it: not its problem
    await assert.rejects(pool.verify('bad.spec.ts'), /bad\.spec\.ts changed the processors/);
    const next = await pool.acquire('MX_STRIPE', 'good.spec.ts');
    assert.notStrictEqual(next.merchantId, first.merchantId, 'a tainted merchant is replaced');
  }
  {
    const { pool, snapshots } = fakePool({ manifest });
    const shared = await pool.acquire('MX_STRIPE', 'bad.spec.ts');
    snapshots.set(shared.merchantId, 'snap-changed');
    await assert.rejects(pool.verify('bad.spec.ts'));
    const next = await pool.acquire('MX_STRIPE', 'good.spec.ts');
    assert.notStrictEqual(next.merchantId, shared.merchantId, 'tainted replica is skipped');
  }

  // --- manifest file: private to the owner, rejected outside its environment
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchant-pool-'));
  const file = path.join(dir, 'manifest.json');
  writeManifest(file, manifest);
  assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);
  assert.strictEqual(
    loadManifest({ env: 'staging', baseUrl: 'https://api.example' }, file)?.entries.MX_STRIPE
      .replicas.length,
    3
  );
  assert.throws(
    () => loadManifest({ env: 'develop', baseUrl: 'https://api.example' }, file),
    /provisioned for staging/
  );
  assert.strictEqual(loadManifest({ env: 'staging', baseUrl: 'x' }, undefined), undefined);
  fs.rmSync(dir, { recursive: true });

  // --- release: a worker deletes the processors it provisioned for releaseProcessorsAfterRun entries
  {
    const { pool, calls, released } = fakePool();
    assert.deepStrictEqual(await pool.releaseWorkerProvisioned(), []);
    assert.strictEqual(calls.adminToken, 0, 'nothing provisioned, nothing released, no login');
    await pool.acquire('MX_STRIPE', 'stripe.spec.ts');
    const paypal = await pool.acquire('PAYPAL_WALLET_CHECKOUT_MX', 'paypal.spec.ts');
    assert.deepStrictEqual(await pool.releaseWorkerProvisioned(), []);
    assert.deepStrictEqual(released, paypal.processorIds, 'only the PayPal entry is released');
    assert.deepStrictEqual(await pool.releaseWorkerProvisioned(), [], 'released once');
    assert.strictEqual(released.length, paypal.processorIds.length);
  }
  {
    // A merchant from the manifest is shared by every worker: CI releases it, not the worker.
    const shared: MerchantPoolManifest = {
      ...manifest,
      entries: {
        PAYPAL_WALLET_CHECKOUT_MX: {
          fingerprint: fingerprint(MERCHANT_POOL.PAYPAL_WALLET_CHECKOUT_MX),
          replicas: [merchant('pp-shared')],
        },
      },
    };
    const { pool, released } = fakePool({ manifest: shared });
    const m = await pool.acquire('PAYPAL_WALLET_CHECKOUT_MX', 'paypal.spec.ts');
    assert.strictEqual(m.source, 'manifest');
    await pool.releaseWorkerProvisioned();
    assert.deepStrictEqual(released, [], 'manifest merchants are left to cli/release.ts');
  }
  {
    // A tainted PayPal merchant is replaced, and both are released: neither keeps a webhook.
    const { pool, snapshots, released } = fakePool();
    const first = await pool.acquire('PAYPAL_WALLET_CHECKOUT_MX', 'bad.spec.ts');
    snapshots.set(first.merchantId, 'snap-changed');
    await assert.rejects(pool.verify('bad.spec.ts'));
    const second = await pool.acquire('PAYPAL_WALLET_CHECKOUT_MX', 'good.spec.ts');
    await pool.releaseWorkerProvisioned();
    assert.deepStrictEqual(released.sort(), [...first.processorIds, ...second.processorIds].sort());
  }
  {
    const { pool } = fakePool({ failRelease: ['proc-w-1'] });
    await pool.acquire('PAYPAL_WALLET_CHECKOUT_MX', 'paypal.spec.ts');
    assert.deepStrictEqual(
      await pool.releaseWorkerProvisioned(),
      ['proc-w-1'],
      'failures are reported'
    );
  }

  console.log('merchant-pool.test.ts: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
