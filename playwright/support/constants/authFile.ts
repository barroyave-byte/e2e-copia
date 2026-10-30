export const AUTH_FILE_PATH = 'playwright/.auth/user.json';
export const AUTH_MODE_FILE_PATH = 'playwright/.auth/auth-mode.json';

/**
 * Admin API token the setup project leaves for the workers (auth.setup.ts), so a shard logs in
 * through the API once instead of once per worker. Git-ignored, like the rest of playwright/.auth.
 */
export const ADMIN_API_TOKEN_FILE_PATH = 'playwright/.auth/admin-api-token.json';

/**
 * Shared storageState file for the Auth0 admin 2FA security suites
 * (ADM-T799/T800/T801).
 *
 * These suites authenticate as a dedicated `mfa-adm-t*` user and MUST write to
 * this file — never the shared AUTH_FILE_PATH — so they don't overwrite the
 * baseline session that every parallel `chromium` test reads from disk at context
 * creation time. Sharing AUTH_FILE_PATH caused cross-test session contamination.
 *
 * A single file is safe because these suites run under `test.describe.serial`
 * (see ADM-T799.spec.ts), so they never execute concurrently and never clobber
 * each other's session. If they are ever made parallel, switch back to one file
 * per suite.
 */
export const AUTH0_SECURITY_AUTH_FILE = 'playwright/.auth/auth0.json';
