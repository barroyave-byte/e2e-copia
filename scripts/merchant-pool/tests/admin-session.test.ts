// Usage: npm run test:merchant-pool (all), or npx ts-node -r tsconfig-paths/register scripts/merchant-pool/tests/admin-session.test.ts
//
// The regression logs in to the admin once and every shard installs that session
// (playwright/support/adminSession.ts, auth.setup.ts): what a shard accepts and what it leaves on disk.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-session-'));
process.env.ADMIN_API_TOKEN_FILE = path.join(dir, 'setup', 'admin-api-token.json'); // before the imports read it

import {
  AdminSessionBundle,
  installAdminSession,
  packAdminSession,
  readAdminSession,
  validateAdminSession,
} from '@support/adminSession';
import { readAdminApiToken, saveAdminApiToken } from '@support/http/utils/AdminApiTokenFile';

const HOUR = 3_600_000;
const jwt = (expMs: number, n = 0) =>
  `h.${Buffer.from(JSON.stringify({ exp: Math.floor(expMs / 1000), n })).toString('base64url')}.s`;
const target = { baseUrl: 'https://api.stg.example', adminUrl: 'https://admin.stg.example' };
const storageState = (token: string) => ({
  cookies: [{ name: 'rl_session', value: 'x', domain: '.example' }],
  origins: [
    { origin: target.adminUrl, localStorage: [{ name: 'token', value: token }] },
    { origin: 'https://other.example', localStorage: [{ name: 'token', value: 'not this one' }] },
  ],
});

// --- pack: what the setup project left in playwright/.auth
const setupPaths = {
  storageState: path.join(dir, 'setup', 'user.json'),
  authMode: path.join(dir, 'setup', 'auth-mode.json'),
};
const uiJwt = jwt(Date.now() + 72 * HOUR, 1);
const apiJwt = jwt(Date.now() + 72 * HOUR, 2);
fs.mkdirSync(path.dirname(setupPaths.storageState), { recursive: true });
fs.writeFileSync(setupPaths.storageState, JSON.stringify(storageState(uiJwt)));
fs.writeFileSync(setupPaths.authMode, JSON.stringify({ authMode: 'legacy' }));
saveAdminApiToken(apiJwt, target.baseUrl);

const bundle = packAdminSession(target, setupPaths);
assert.deepStrictEqual(
  [bundle.apiToken, bundle.authMode, bundle.storageState],
  [apiJwt, 'legacy', storageState(uiJwt)]
);
assert.doesNotThrow(() => validateAdminSession(bundle, target));
assert.throws(
  () => packAdminSession({ ...target, baseUrl: 'https://api.prod.example' }, setupPaths),
  /no admin API token/,
  'an API token of another environment is not packed'
);

// --- validate: everything a shard refuses, with the reason
const rejects = (b: AdminSessionBundle, reason: RegExp, opts = {}) =>
  assert.throws(() => validateAdminSession(b, target, opts), reason);
rejects({ ...bundle, version: 2 }, /unsupported bundle version/);
rejects(
  { version: 0, revoked: 'token removed at the end of the regression' } as any,
  /re-run all jobs/,
  {}
);
rejects({ ...bundle, baseUrl: 'https://api.prod.example' }, /this run targets/);
rejects({ ...bundle, adminUrl: 'https://admin.prod.example' }, /this run targets/);
rejects({ ...bundle, authMode: 'auth0' }, /only the legacy login is/);
rejects({ ...bundle, storageState: { cookies: [], origins: [] } }, /no admin UI token/);
rejects(
  { ...bundle, storageState: storageState(jwt(Date.now() + HOUR)) },
  /admin UI token expires/
);
rejects({ ...bundle, apiToken: jwt(Date.now() + HOUR) }, /admin API token expires in 1\.0h/);
rejects({ ...bundle, apiToken: 'not-a-jwt' }, /admin API token has no expiry/);
rejects(bundle, /re-run the whole workflow/, { now: Date.now() + 71 * HOUR });

// --- read: a missing or broken file says so, without its content
assert.throws(() => readAdminSession(path.join(dir, 'missing.json')), /cannot read.*ENOENT/);
const broken = path.join(dir, 'broken.json');
fs.writeFileSync(broken, `{"apiToken":"${apiJwt}"`);
assert.throws(
  () => readAdminSession(broken),
  (e: Error) => /cannot read/.test(e.message) && !e.message.includes(apiJwt),
  'the error never carries the token'
);

// --- install: the same files the setup project writes, owner-only
const shard = {
  storageState: path.join(dir, 'shard', 'user.json'),
  authMode: path.join(dir, 'shard', 'auth-mode.json'),
};
fs.rmSync(process.env.ADMIN_API_TOKEN_FILE!);
installAdminSession(bundle, shard);
assert.deepStrictEqual(
  JSON.parse(fs.readFileSync(shard.storageState, 'utf8')),
  storageState(uiJwt)
);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(shard.authMode, 'utf8')), { authMode: 'legacy' });
assert.strictEqual(readAdminApiToken(target.baseUrl), apiJwt, 'the workers find the API token');
for (const file of [shard.storageState, process.env.ADMIN_API_TOKEN_FILE!]) {
  assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600, `${file} is owner-only`);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log('merchant-pool-admin-session.test.ts: all assertions passed');
