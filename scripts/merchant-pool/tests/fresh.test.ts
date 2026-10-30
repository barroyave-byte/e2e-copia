// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/fresh.test.ts
//
// Pre-provisioned single-use merchants (docs/merchant-pool-plan.md, section 4.6): stock planning,
// adaptive concurrency, claims across worker processes, and createBasicMerchant using the stock.
import * as assert from 'assert';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { AddressInfo } from 'net';
import envConfig from '@support/envConfig';
import { BaseHttpClient } from '@support/http/BaseHttpClient';
import { MerchantAuthService } from '@support/http/services/MerchantAuthService';
import {
  claimFreshMerchant,
  FreshMerchant,
  resetFreshMerchants,
  setFreshMerchantShard,
} from '@support/merchantPool/fresh';
import { MANIFEST_ENV_VAR, MANIFEST_VERSION, writeManifest } from '@support/merchantPool/manifest';
import { merchantDemand } from '@support/merchantPool/demand';
import { DEADLINE, runAdaptive } from '../lib/adaptive';
import { distribute, distributeEvenly, planStock, totalsByCountry } from '../lib/stock';
import { runnableSpecFiles } from '../lib/shards';

const fresh = (id: string): FreshMerchant => ({
  merchantId: id,
  merchantName: `name ${id}`,
  privateKey: `priv ${id}`,
  publicKey: `pub ${id}`,
});

function manifestWith(dir: string, byShard: Record<string, Record<string, FreshMerchant[]>>) {
  const file = path.join(dir, `manifest-${Math.random().toString(36).slice(2)}.json`);
  writeManifest(file, {
    version: MANIFEST_VERSION,
    env: envConfig.NODE_ENV,
    baseUrl: envConfig.BASE_URL_POSTMAN,
    createdAt: new Date().toISOString(),
    entries: {},
    fresh: byShard,
  });
  return file;
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchant-pool-fresh-'));

  // --- planStock: static demand + margin, at least one MX spare per shard
  const demand: Record<string, Record<string, number>> = {
    'a.spec.ts': { MX: 1 },
    'b.spec.ts': { MX: 2, CO: 1 },
    'c.spec.ts': {},
  };
  const plan = planStock(
    new Map([
      [1, ['a.spec.ts', 'b.spec.ts']],
      [2, ['c.spec.ts']],
    ]),
    (f) => demand[f] ?? {},
    0.1
  );
  assert.deepStrictEqual(plan.get(1), { MX: 4, CO: 2 }, 'demand 3+1 MX spare, 1+1 CO spare');
  assert.deepStrictEqual(plan.get(2), { MX: 1 }, 'a shard with no demand still gets one MX spare');
  assert.deepStrictEqual(totalsByCountry(plan), { MX: 5, CO: 2 });

  // --- merchantDemand: a local helper counts only for the functions the spec calls
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demand-'));
    fs.mkdirSync(path.join(dir, 'common'));
    fs.writeFileSync(
      path.join(dir, 'common', 'index.ts'),
      [
        "export const account = { email: 'x' };",
        'export const init = async () => {',
        "  return configMerchantCheckout.basicSetup('MX');",
        '};',
        'export async function registerUser(email: string) {',
        '  return email;',
        '}',
        'export class CheckoutFlow {',
        "  async setup() { return configMerchant.basicSetup('CO'); }",
        '}',
      ].join('\n')
    );
    const spec = (name: string, body: string) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, body);
      return file;
    };
    const pooled = spec(
      'pooled.spec.ts',
      "import { account, registerUser } from './common';\nawait merchantPool.acquire('K');\nregisterUser(account.email);"
    );
    const withInit = spec(
      'init.spec.ts',
      "import { account, init } from './common';\nawait init();"
    );
    const aliased = spec(
      'alias.spec.ts',
      "import { init as setup } from './common';\nawait setup();"
    );
    const namespace = spec('ns.spec.ts', "import * as common from './common';\ncommon.account;");
    const own = spec('own.spec.ts', "await configMerchant.basicSetup('CO');");
    const flow = spec(
      'flow.spec.ts',
      "import { CheckoutFlow } from './common';\nawait new CheckoutFlow().setup();"
    );
    assert.deepStrictEqual(merchantDemand(pooled), {}, 'imports a helper but never calls init()');
    assert.deepStrictEqual(merchantDemand(withInit), { MX: 1 }, 'calls init() once');
    assert.deepStrictEqual(merchantDemand(aliased), { MX: 1 }, 'calls init() through an alias');
    assert.deepStrictEqual(
      merchantDemand(namespace),
      { MX: 1, CO: 1 },
      'a namespace import counts the whole file'
    );
    assert.deepStrictEqual(merchantDemand(own), { CO: 1 }, 'its own basicSetup');
    assert.deepStrictEqual(merchantDemand(flow), { CO: 1 }, 'a helper class it instantiates');
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // --- runnableSpecFiles: files whose tests are all fixme/skip claim no merchant
  const listed = {
    suites: [
      { file: 'a.spec.ts', specs: [{ file: 'a.spec.ts', tests: [{ expectedStatus: 'passed' }] }] },
      {
        file: 'fixme.spec.ts',
        specs: [
          {
            file: 'fixme.spec.ts',
            tests: [{ expectedStatus: 'skipped' }, { expectedStatus: 'skipped' }],
          },
        ],
      },
      {
        file: 'mixed.spec.ts',
        specs: [
          {
            file: 'mixed.spec.ts',
            tests: [{ expectedStatus: 'skipped' }, { expectedStatus: 'passed' }],
          },
        ],
      },
      {
        file: 'auth.setup.ts',
        specs: [{ file: 'auth.setup.ts', tests: [{ expectedStatus: 'passed' }] }],
      },
    ],
  };
  assert.deepStrictEqual(runnableSpecFiles(listed).sort(), ['a.spec.ts', 'mixed.spec.ts']);

  // --- distribute: in shard order; a shortfall leaves the last shards short, never duplicates
  const created = { MX: ['m1', 'm2', 'm3', 'm4'].map(fresh), CO: [fresh('c1')] };
  const byShard = distribute(plan, created);
  assert.deepStrictEqual(
    Object.fromEntries(
      Object.entries(byShard).map(([s, c]) => [
        s,
        Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.map((m) => m.merchantId)])),
      ])
    ),
    { '1': { MX: ['m1', 'm2', 'm3', 'm4'], CO: ['c1'] } }
  );

  // --- runAdaptive: never exceeds the limit, halves on failure, returns every result
  let running = 0;
  let peak = 0;
  const limits: number[] = [];
  const results = await runAdaptive(
    Array.from({ length: 30 }, (_, i) => async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setImmediate(r));
      running -= 1;
      if (i === 3) throw new Error('boom');
      return i;
    }),
    { initial: 8, min: 2, growAfter: 5, onLimitChange: (l) => limits.push(l) }
  );
  assert.ok(peak <= 8, `peak ${peak} within the limit`);
  assert.strictEqual(limits[0], 4, 'a failure halves the limit');
  assert.ok(limits.includes(5), 'successes grow it back');
  assert.strictEqual(results.filter((r) => r.status === 'rejected').length, 1);
  assert.strictEqual(results.length, 30);

  // --- runAdaptive deadline: stops starting tasks, then abandons the ones still in flight
  const never = () => new Promise<number>(() => {});
  const t0 = Date.now();
  const cut = await runAdaptive([async () => 1, never, never, async () => 4], {
    initial: 2,
    giveUpAt: Date.now() + 150,
  });
  assert.ok(Date.now() - t0 < 1000, 'returns at giveUpAt instead of waiting for hung tasks');
  assert.deepStrictEqual(
    cut.map((r) => (r.status === 'fulfilled' ? r.value : (r.reason as Error).message)),
    [1, DEADLINE, DEADLINE, DEADLINE],
    'what finished is kept; the hung and the never-started end as deadline'
  );
  let started = 0;
  const none = await runAdaptive([async () => started++, async () => started++], {
    initial: 2,
    stopStartingAt: Date.now() - 1,
  });
  assert.strictEqual(started, 0, 'past the stop time nothing starts');
  assert.ok(none.every((r) => r.status === 'rejected'));

  // --- distributeEvenly: round robin per country, nothing lost or duplicated
  const even = distributeEvenly({ MX: ['a', 'b', 'c', 'd', 'e'].map(fresh), CO: [fresh('z')] }, 2);
  assert.deepStrictEqual(
    Object.fromEntries(
      Object.entries(even).map(([sh, c]) => [
        sh,
        Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.map((m) => m.merchantId)])),
      ])
    ),
    { '1': { MX: ['a', 'c', 'e'], CO: ['z'] }, '2': { MX: ['b', 'd'] } }
  );

  // --- claims: only with a manifest and a shard; each merchant once; other shards untouched
  const file = manifestWith(dir, { '3': { MX: [fresh('x1'), fresh('x2')] } });
  process.env[MANIFEST_ENV_VAR] = file;
  resetFreshMerchants();
  assert.strictEqual(claimFreshMerchant('MX'), undefined, 'no shard (local run): nothing claimed');
  setFreshMerchantShard(4);
  assert.strictEqual(claimFreshMerchant('MX'), undefined, 'another shard gets nothing of shard 3');
  setFreshMerchantShard(3);
  assert.strictEqual(claimFreshMerchant('MX')?.merchantId, 'x1');
  assert.strictEqual(claimFreshMerchant('MX')?.merchantId, 'x2');
  assert.strictEqual(claimFreshMerchant('MX'), undefined, 'stock exhausted');
  assert.strictEqual(claimFreshMerchant('CO'), undefined, 'no stock for that country');

  // --- claims across processes: 6 workers racing for 20 merchants get 20 distinct ones
  const race = manifestWith(dir, {
    '1': { MX: Array.from({ length: 20 }, (_, i) => fresh(`r${i}`)) },
  });
  const worker = path.join(dir, 'claim-worker.ts');
  fs.writeFileSync(
    worker,
    `import { claimFreshMerchant, setFreshMerchantShard } from '@support/merchantPool/fresh';
setFreshMerchantShard(1);
const got: string[] = [];
for (let m = claimFreshMerchant('MX'); m; m = claimFreshMerchant('MX')) got.push(m.merchantId);
process.stdout.write(JSON.stringify(got));`
  );
  const claimed = await Promise.all(
    Array.from(
      { length: 6 },
      () =>
        new Promise<string[]>((resolve, reject) => {
          const child = spawn(
            'npx',
            [
              'ts-node',
              '-P',
              path.resolve('tsconfig.json'),
              '-r',
              'tsconfig-paths/register',
              '--transpile-only',
              worker,
            ],
            { env: { ...process.env, [MANIFEST_ENV_VAR]: race } }
          );
          let out = '';
          child.stdout.on('data', (d) => (out += d));
          child.on('close', (code) =>
            code === 0
              ? resolve(JSON.parse(out.slice(out.lastIndexOf('['))))
              : reject(new Error(`exit ${code}`))
          );
        })
    )
  );
  const all = claimed.flat();
  assert.strictEqual(all.length, 20, 'every merchant handed out');
  assert.strictEqual(new Set(all).size, 20, 'no merchant handed out twice');

  // --- createBasicMerchant: a standard call claims (no merchant created), any option creates
  let creates = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      if (req.url === '/merchants/login') {
        const exp = Math.floor(Date.now() / 1000) + 3600;
        const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ token: `h.${payload}.s` }));
      }
      if (req.url === '/merchants') creates += 1;
      res.writeHead(500);
      res.end('{}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const service = new MerchantAuthService(
    new BaseHttpClient({
      baseUrl: `http://127.0.0.1:${port}`,
      retryAttempts: 0,
      logging: { logRequest: false, logResponse: false, logHeaders: false, logData: false },
    })
  );
  process.env[MANIFEST_ENV_VAR] = manifestWith(dir, { '1': { CO: [fresh('co-1')] } });
  resetFreshMerchants();
  setFreshMerchantShard(1);
  const merchant = await service.createBasicMerchant({ country: 'CO' });
  assert.deepStrictEqual(
    [merchant.merchantId, merchant.privateKey, merchant.publicKey, creates],
    ['co-1', 'priv co-1', 'pub co-1', 0],
    'claimed with its own key pair, nothing created'
  );
  assert.ok(merchant.merchantToken.startsWith('h.'), 'with the worker admin token');
  await assert.rejects(service.createBasicMerchant({ country: 'CO', customName: 'x' }));
  assert.strictEqual(creates, 1, 'a non-standard call creates the merchant as before');
  server.closeAllConnections();
  await new Promise((r) => server.close(r));

  delete process.env[MANIFEST_ENV_VAR];
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('merchant-pool-fresh.test.ts: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
