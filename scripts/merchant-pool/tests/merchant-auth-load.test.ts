// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/merchant-auth-load.test.ts
//
// Phase 0 of docs/merchant-pool-plan.md: retry policy, admin token cache and fail-fast merchant
// provisioning, exercised against a local HTTP server that stands in for merchant-auth.
import * as assert from 'assert';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Never read or write the real setup-project token (playwright/.auth/admin-api-token.json).
process.env.ADMIN_API_TOKEN_FILE = join(mkdtempSync(join(tmpdir(), 'token-test-')), 'token.json');
import * as http from 'http';
import { AddressInfo } from 'net';
import { BaseHttpClient } from '@support/http/BaseHttpClient';
import { MerchantAuthService } from '@support/http/services/MerchantAuthService';
import { PaymentService } from '@support/http/services/PaymentService';
import {
  computeBackoffDelay,
  isRetryableStatus,
  MAX_RETRY_DELAY_MS,
  SAFE_RETRY_STATUSES_FOR_CREATE,
} from '@support/http/utils/retryPolicy';
import { ExpiringTokenCache, readJwtExpiry } from '@support/http/utils/ExpiringTokenCache';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { MerchantRegistry } from '@support/utils/MerchantRegistry';

// These suites run in develop, staging and preprod, and the preprod registry is a real file
// (playwright/.debug/merchant-registry.log) that global.teardown bulk-deletes through Permit.io.
// Never let the fake merchants of this test reach it, whatever NODE_ENV the shell exported.
const registered: string[] = [];
MerchantRegistry.getInstance = () =>
  ({
    register: (merchantId: string) => registered.push(merchantId),
  }) as unknown as MerchantRegistry;
const originalEnv = envConfig.NODE_ENV;
envConfig.NODE_ENV = allowedEnvironments.STAGING;

// 'drop' closes the connection without answering; 'hang' never answers (a timeout).
type Handler = (req: http.IncomingMessage) => { status: number | 'drop' | 'hang'; body?: unknown };

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(claims)}.sig`;
}

async function withServer(handler: Handler, run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const { status, body } = handler(req);
      if (status === 'drop') return req.socket.destroy();
      if (status === 'hang') return;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body ?? {}));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

const quietLogging = { logRequest: false, logResponse: false, logHeaders: false, logData: false };
const client = (baseUrl: string) =>
  new BaseHttpClient({ baseUrl, retryAttempts: 3, retryDelay: 5, logging: quietLogging });

async function main() {
  // --- retryPolicy
  assert.strictEqual(
    computeBackoffDelay(1, 1000, MAX_RETRY_DELAY_MS, () => 0.999),
    999
  );
  assert.strictEqual(
    computeBackoffDelay(3, 1000, MAX_RETRY_DELAY_MS, () => 0.5),
    2000
  );
  assert.strictEqual(
    computeBackoffDelay(10, 1000, MAX_RETRY_DELAY_MS, () => 0.999),
    7992
  );
  assert.strictEqual(
    computeBackoffDelay(2, 1000, MAX_RETRY_DELAY_MS, () => 0),
    0
  );
  assert.ok(isRetryableStatus(504));
  assert.ok(!isRetryableStatus(504, SAFE_RETRY_STATUSES_FOR_CREATE));
  assert.ok(isRetryableStatus(503, SAFE_RETRY_STATUSES_FOR_CREATE));
  assert.ok(!isRetryableStatus(undefined));

  // --- ExpiringTokenCache
  const exp = 2_000_000_000;
  assert.strictEqual(readJwtExpiry(jwt({ exp })), exp * 1000);
  assert.strictEqual(readJwtExpiry('not-a-jwt'), undefined);

  let now = exp * 1000 - 60 * 60 * 1000; // one hour before expiry
  let fetches = 0;
  const cache = new ExpiringTokenCache(() => now);
  const fetchToken = async () => {
    fetches += 1;
    return jwt({ exp, n: fetches });
  };
  const concurrent = await Promise.all([cache.get(fetchToken), cache.get(fetchToken)]);
  assert.strictEqual(fetches, 1, 'concurrent callers share one fetch');
  assert.strictEqual(concurrent[0], concurrent[1]);
  await cache.get(fetchToken);
  assert.strictEqual(fetches, 1, 'a valid token is reused');
  now = exp * 1000 - 60 * 1000; // inside the refresh margin
  await cache.get(fetchToken);
  assert.strictEqual(fetches, 2, 'a token about to expire is refreshed');
  cache.invalidate();
  await cache.get(fetchToken);
  assert.strictEqual(fetches, 3, 'invalidate forces a new fetch');
  const failing = new ExpiringTokenCache(() => now);
  await assert.rejects(failing.get(async () => Promise.reject(new Error('login down'))));
  assert.strictEqual(await failing.get(fetchToken), jwt({ exp, n: 4 }), 'failures are not cached');

  // --- BaseHttpClient: the attempt cap is honoured (it used to stop after one retry)
  let calls = 0;
  await withServer(
    () => {
      calls += 1;
      return { status: calls <= 3 ? 503 : 200, body: { ok: true } };
    },
    async (baseUrl) => {
      const res = await client(baseUrl).request({ method: 'GET', url: '/x' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(calls, 4, 'initial call + 3 retries');
    }
  );

  // --- BaseHttpClient: retryOn narrows the statuses for a non-idempotent write
  calls = 0;
  await withServer(
    () => {
      calls += 1;
      return { status: 504 };
    },
    async (baseUrl) => {
      await assert.rejects(
        client(baseUrl).request({
          method: 'POST',
          url: '/create',
          retryOn: SAFE_RETRY_STATUSES_FOR_CREATE,
        }),
        (error: any) => error.status === 504
      );
      assert.strictEqual(calls, 1, 'a 504 on create is not resent');
    }
  );

  // --- BaseHttpClient: a request without a response is retried only when it opts in
  calls = 0;
  await withServer(
    () => {
      calls += 1;
      return { status: 'drop' };
    },
    async (baseUrl) => {
      await assert.rejects(
        client(baseUrl).request({ method: 'POST', url: '/create' }),
        (error: any) => error.code === 'NETWORK_ERROR'
      );
      assert.strictEqual(calls, 1, 'a dropped connection is not resent by default');
    }
  );
  calls = 0;
  await withServer(
    () => {
      calls += 1;
      if (calls === 1) return { status: 'drop' };
      if (calls === 2) return { status: 'hang' };
      return { status: 200, body: { ok: true } };
    },
    async (baseUrl) => {
      const res = await client(baseUrl).request({
        method: 'POST',
        url: '/login',
        retryOnNoResponse: true,
        timeout: 200,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(calls, 3, 'dropped connection and timeout are both retried when opted in');
    }
  );

  // --- MerchantAuthService: one admin login per worker, fail fast on a broken step
  const adminToken = () =>
    jwt({ exp: Math.floor(Date.now() / 1000) + 72 * 3600, merchant_id: null });
  const counts = { login: 0, create: 0, store: 0, applications: 0 };
  let storeRejectsOnce = false;
  let applicationsStatus = 200;
  const handler: Handler = (req) => {
    const url = req.url ?? '';
    if (url === '/merchants/login') {
      counts.login += 1;
      return { status: 200, body: { token: adminToken() } };
    }
    if (url === '/merchants') {
      counts.create += 1;
      return { status: 200, body: { id: `m-${counts.create}`, name: `merchant ${counts.create}` } };
    }
    if (url.endsWith('/stores')) {
      counts.store += 1;
      if (storeRejectsOnce) {
        storeRejectsOnce = false;
        return { status: 401, body: { code: 'UNAUTHORIZED' } };
      }
      return { status: 200, body: {} };
    }
    if (url.endsWith('/applications')) {
      counts.applications += 1;
      return applicationsStatus === 200
        ? { status: 200, body: { private_key: 'priv', public_key: 'pub' } }
        : { status: applicationsStatus, body: { code: 'BOOM' } };
    }
    return { status: 404 };
  };

  await withServer(handler, async (baseUrl) => {
    const service = new MerchantAuthService(client(baseUrl));

    const merchants = await Promise.all(
      ['MX', 'CO', 'BR'].map((country) => service.createBasicMerchant({ country } as any))
    );
    assert.strictEqual(counts.login, 1, 'three merchants, one admin login');
    assert.deepStrictEqual(
      merchants.map((m) => [m.merchantId, m.privateKey, m.publicKey]),
      [
        ['m-1', 'priv', 'pub'],
        ['m-2', 'priv', 'pub'],
        ['m-3', 'priv', 'pub'],
      ]
    );

    storeRejectsOnce = true;
    await service.createBasicMerchant({ country: 'MX' } as any);
    assert.strictEqual(counts.login, 2, 'a 401 on the cached token logs in again once');

    applicationsStatus = 400;
    await assert.rejects(
      service.createBasicMerchant({ country: 'MX' } as any),
      (error: Error) =>
        error.message.includes('step "applications"') &&
        error.message.includes('merchant m-5') &&
        error.message.includes('HTTP 400'),
      'a failed applications call is no longer swallowed'
    );
    assert.deepStrictEqual(registered, [], 'outside preprod nothing is registered for cleanup');

    // Preprod: a merchant whose later step fails still exists, so it must be registered for the
    // teardown cleanup before that step runs (it used to be registered only on full success).
    envConfig.NODE_ENV = allowedEnvironments.PRE_PRODUCTION;
    applicationsStatus = 200;
    storeRejectsOnce = false;
    await service.createBasicMerchant({ country: 'MX' } as any);
    applicationsStatus = 500;
    await assert.rejects(service.createBasicMerchant({ country: 'MX' } as any));
    assert.deepStrictEqual(registered, ['m-6', 'm-7'], 'preprod registers every created merchant');
    envConfig.NODE_ENV = allowedEnvironments.STAGING;
  });

  // --- A login that never answers is retried, then reported as its own "token" step
  let logins = 0;
  await withServer(
    (req) => {
      if (req.url === '/merchants/login') {
        logins += 1;
        return { status: 'drop' };
      }
      return handler(req);
    },
    async (baseUrl) => {
      const service = new MerchantAuthService(client(baseUrl));
      await assert.rejects(
        service.createBasicMerchant({ country: 'MX' } as any),
        (error: Error) =>
          error.message.includes('step "token"') && error.message.includes('NETWORK_ERROR'),
        'a failed login is not reported as a store failure'
      );
      assert.strictEqual(logins, 4, 'the login is sent once and retried three times');
    }
  );

  envConfig.NODE_ENV = originalEnv;
  // --- createPaymentProcessor: a 200 without data.id shows what came back, credentials redacted
  await withServer(
    () => ({
      status: 200,
      body: { code: 'error.external_integration', private_api_key: 'sk_test_SECRET' },
    }),
    async (baseUrl) => {
      const payments = new PaymentService(client(baseUrl));
      await assert.rejects(
        payments.createPaymentProcessor('m-1', 'token', { name: 'paypal' } as any),
        (error: Error) =>
          error.message.includes('HTTP 200 without data.id') &&
          error.message.includes('error.external_integration') &&
          !error.message.includes('sk_test_SECRET'),
        'used to be "Create payment processor failed: {}"'
      );
    }
  );

  console.log('merchant-auth-load.test.ts: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
