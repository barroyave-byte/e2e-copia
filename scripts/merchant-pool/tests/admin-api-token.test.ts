// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/admin-api-token.test.ts
//
// The setup project logs in once per shard and leaves the admin token for the workers
// (auth.setup.ts, AdminApiTokenFile): guards on the file and how MerchantAuthService uses it.
import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { AddressInfo } from 'net';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-api-token-'));
const file = path.join(dir, '.auth', 'admin-api-token.json');
process.env.ADMIN_API_TOKEN_FILE = file; // before the modules read it

import { BaseHttpClient } from '@support/http/BaseHttpClient';
import { MerchantAuthService } from '@support/http/services/MerchantAuthService';
import { readAdminApiToken, saveAdminApiToken } from '@support/http/utils/AdminApiTokenFile';

const jwt = (expSeconds: number, n = 0) =>
  `h.${Buffer.from(JSON.stringify({ exp: expSeconds, n })).toString('base64url')}.s`;
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;
const quiet = { logRequest: false, logResponse: false, logHeaders: false, logData: false };

async function main() {
  // --- the file: owner-only, per environment, never an expiring token
  const token = jwt(inOneHour(), 1);
  saveAdminApiToken(token, 'https://api.stg.example');
  assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);
  assert.strictEqual(readAdminApiToken('https://api.stg.example'), token);
  assert.strictEqual(
    readAdminApiToken('https://api.dev.example'),
    undefined,
    'another environment'
  );
  saveAdminApiToken(jwt(Math.floor(Date.now() / 1000) + 60), 'https://api.stg.example');
  assert.strictEqual(readAdminApiToken('https://api.stg.example'), undefined, 'about to expire');
  fs.writeFileSync(file, '{"token": "half');
  assert.strictEqual(readAdminApiToken('https://api.stg.example'), undefined, 'unreadable file');
  fs.rmSync(file);
  assert.strictEqual(readAdminApiToken('https://api.stg.example'), undefined, 'no file');

  // --- MerchantAuthService against a fake merchant-auth
  let logins = 0;
  let creates = 0;
  let storeRejects = 0;
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.url === '/merchants/login')
        return send(200, { token: jwt(inOneHour(), 100 + ++logins) });
      if (req.url === '/merchants') return send(200, { id: `m-${++creates}`, name: 'm' });
      if (req.url?.endsWith('/stores')) {
        if (storeRejects > 0) {
          storeRejects -= 1;
          return send(401, { code: 'UNAUTHORIZED' });
        }
        return send(200, {});
      }
      if (req.url?.endsWith('/applications'))
        return send(200, { private_key: 'priv', public_key: 'pub' });
      send(404, {});
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const service = () =>
    new MerchantAuthService(new BaseHttpClient({ baseUrl, retryAttempts: 0, logging: quiet }));

  // The setup project publishes one token for the shard...
  await service().publishAdminTokenForWorkers();
  assert.strictEqual(logins, 1);
  const published = readAdminApiToken(baseUrl);
  assert.ok(published, 'published for this base URL');

  // ...and every worker uses it without logging in.
  const workers = [service(), service(), service()];
  const merchants = await Promise.all(workers.map((w) => w.createBasicMerchant({ country: 'MX' })));
  assert.strictEqual(logins, 1, 'three workers, no login of their own');
  assert.ok(merchants.every((m) => m.merchantToken === published));

  // A 401 on the setup token: that worker logs in once and never goes back to the rejected token.
  const rejected = service();
  storeRejects = 1;
  const after401 = await rejected.createBasicMerchant({ country: 'MX' });
  assert.strictEqual(logins, 2, 'logged in after the 401');
  assert.notStrictEqual(after401.merchantToken, published);
  await rejected.createBasicMerchant({ country: 'MX' });
  assert.strictEqual(logins, 2, 'keeps its own token, does not reread the rejected one');

  // No setup token (local run with --no-deps, only_preprod): logs in as before.
  fs.rmSync(file);
  await service().createBasicMerchant({ country: 'MX' });
  assert.strictEqual(logins, 3);

  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('admin-api-token.test.ts: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
