// Usage: npx playwright test --project=setup && npm run merchant-pool:admin-session -- --out admin-session.json
//
// Packs the admin session the setup project just left in playwright/.auth, so the shards of a
// regression install it instead of logging in (docs/merchant-pool-plan.md, section 4.18). Run by
// the admin-session job of regression_tests.yml. Exits non-zero, saying why, unless both tokens are
// fresh and merchant-auth accepts them: that job failing stops the regression before any shard
// starts, which is the point.
//
// The bundle holds a superadmin token: never print it. The check below calls merchant-auth with
// fetch on purpose; BaseHttpClient logs request headers, the Bearer included.
import envConfig from '@support/envConfig';
import { EndpointConfig } from '@support/http/config/EndpointConfig';
import {
  packAdminSession,
  uiToken,
  validateAdminSession,
  writePrivateJson,
} from '@support/adminSession';

/** A freshly logged-in token lives ~72h; less than this means the login did not just happen. */
const MIN_REMAINING_AT_PACK_MS = 24 * 60 * 60 * 1000;

async function accepted(token: string, baseUrl: string): Promise<number> {
  const url = new URL(EndpointConfig.getEndpoint('merchant', 'currentUserProfile'), baseUrl);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  return response.status;
}

async function main() {
  const i = process.argv.indexOf('--out');
  const out = i === -1 ? undefined : process.argv[i + 1];
  if (!out) throw new Error('--out <file> is required');

  const target = { baseUrl: envConfig.BASE_URL_POSTMAN, adminUrl: envConfig.ADMIN_URL };
  const bundle = packAdminSession(target);
  validateAdminSession(bundle, target, { minRemainingMs: MIN_REMAINING_AT_PACK_MS });
  for (const [name, token] of [
    ['admin UI', uiToken(bundle)!],
    ['admin API', bundle.apiToken],
  ] as const) {
    const status = await accepted(token, target.baseUrl);
    if (status !== 200)
      throw new Error(`merchant-auth rejected the ${name} token (HTTP ${status})`);
  }
  writePrivateJson(out, bundle);
  console.log(
    `[admin-session] packed for ${target.adminUrl}: both tokens accepted by merchant-auth`
  );
}

main().catch((error) => {
  console.error(`[admin-session] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
