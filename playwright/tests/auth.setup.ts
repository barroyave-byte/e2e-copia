import { test as setup } from '@support/fixtures';
import { adminAuthenticate, saveAuthMode } from '@pages/admin/authentication';
import {
  ADMIN_SESSION_BUNDLE_ENV,
  installAdminSession,
  readAdminSession,
  validateAdminSession,
} from '@support/adminSession';
import envConfig from '@support/envConfig';

/**
 * In CI the regression logs in once (job admin-session) and every shard installs that session
 * instead of logging in (docs/merchant-pool-plan.md, section 4.18). A bundle that does not fit this
 * run fails here, before any test: a shard that logged in on its own would bring back the burst
 * this removes, and nobody would notice.
 */
const bundlePath = process.env[ADMIN_SESSION_BUNDLE_ENV];

if (bundlePath) {
  setup('install the shared admin session', () => {
    const bundle = readAdminSession(bundlePath);
    validateAdminSession(bundle, {
      baseUrl: envConfig.BASE_URL_POSTMAN,
      adminUrl: envConfig.ADMIN_URL,
    });
    installAdminSession(bundle);
    console.log(`[auth.setup] shared admin session from ${bundle.createdAt} installed, no login`);
  });
} else {
  setup('authenticate', async ({ page }) => {
    const authMode = await adminAuthenticate(page);
    saveAuthMode(authMode);
  });

  /**
   * One API login per shard: the token is left in playwright/.auth/admin-api-token.json and every
   * worker uses it instead of logging in itself (~120 simultaneous logins at start-up before).
   *
   * Optional by design: if it fails, the workers log in themselves as before. Failing here would
   * fail the setup project, and Playwright skips every chromium test that depends on it.
   */
  setup('admin API token for the workers', async ({ merchantAuthService }) => {
    try {
      await merchantAuthService.publishAdminTokenForWorkers();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[auth.setup] admin API token not published, workers will log in: ${reason}`);
      setup.info().annotations.push({ type: 'warning', description: `admin API token: ${reason}` });
    }
  });
}
