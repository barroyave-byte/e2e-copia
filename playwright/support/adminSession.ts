import * as fs from 'fs';
import * as path from 'path';
import { AUTH_FILE_PATH, AUTH_MODE_FILE_PATH } from '@support/constants/authFile';
import { readAdminApiToken, saveAdminApiToken } from '@support/http/utils/AdminApiTokenFile';
import { readJwtExpiry } from '@support/http/utils/ExpiringTokenCache';

/**
 * The admin session of a regression, logged in once and shared by every shard
 * (docs/merchant-pool-plan.md, section 4.18).
 *
 * Every shard used to run the setup project's two logins (admin UI and admin API) on its own:
 * ~80 at once in the primary run and as many again in each retry round, each UI login calling
 * merchant-auth five times (/merchants-all among them). CI now logs in once, packs the result here
 * and every shard installs it instead of logging in.
 *
 * Sharing is safe because the UI session is only the merchant-auth JWT in localStorage (no refresh
 * token), and logging out only clears it in the browser: the token stays valid until it expires
 * (verified against staging on 2026-10-19 after ADM-T462, which logs out).
 *
 * The bundle holds a superadmin token: it travels only through encrypted S3, never in an artifact
 * or a log.
 */
export const ADMIN_SESSION_BUNDLE_ENV = 'ADMIN_SESSION_BUNDLE';
export const ADMIN_SESSION_VERSION = 1;

/** A shard must not start with a token that could expire before its tests finish. */
export const MIN_REMAINING_MS = 2 * 60 * 60 * 1000;

export interface AdminSessionBundle {
  version: number;
  baseUrl: string;
  adminUrl: string;
  authMode: string;
  createdAt: string;
  /** Playwright storageState of the admin UI login (playwright/.auth/user.json). */
  storageState: { cookies: unknown[]; origins: AdminOrigin[] };
  /** Admin API token (playwright/.auth/admin-api-token.json). */
  apiToken: string;
}

interface AdminOrigin {
  origin: string;
  localStorage: { name: string; value: string }[];
}

export interface AdminSessionPaths {
  storageState: string;
  authMode: string;
}

const DEFAULT_PATHS: AdminSessionPaths = {
  storageState: AUTH_FILE_PATH,
  authMode: AUTH_MODE_FILE_PATH,
};

/** The merchant-auth JWT admin-ff keeps in localStorage after logging in. */
export function uiToken(bundle: Pick<AdminSessionBundle, 'storageState' | 'adminUrl'>) {
  const origin = bundle.storageState?.origins?.find(
    (o) => o.origin === new URL(bundle.adminUrl).origin
  );
  return origin?.localStorage?.find((item) => item.name === 'token')?.value;
}

/** Builds the bundle from what the setup project left in playwright/.auth. */
export function packAdminSession(
  target: { baseUrl: string; adminUrl: string },
  paths: AdminSessionPaths = DEFAULT_PATHS
): AdminSessionBundle {
  const apiToken = readAdminApiToken(target.baseUrl);
  if (!apiToken) throw new Error('the setup project left no admin API token for this environment');
  const { authMode } = JSON.parse(fs.readFileSync(paths.authMode, 'utf8'));
  return {
    version: ADMIN_SESSION_VERSION,
    baseUrl: target.baseUrl,
    adminUrl: target.adminUrl,
    authMode,
    createdAt: new Date().toISOString(),
    storageState: JSON.parse(fs.readFileSync(paths.storageState, 'utf8')),
    apiToken,
  };
}

/**
 * Throws, saying why, unless the bundle is for this environment and both tokens outlive
 * `minRemainingMs`. Only the legacy login is shared: an Auth0 session may carry a rotating refresh
 * token, and several browsers using one would make Auth0 revoke it for all of them.
 */
export function validateAdminSession(
  bundle: AdminSessionBundle,
  target: { baseUrl: string; adminUrl: string },
  { now = Date.now(), minRemainingMs = MIN_REMAINING_MS } = {}
): void {
  if ((bundle as { revoked?: string })?.revoked) {
    throw new Error(
      'the shared admin session was revoked when the regression ended; "Re-run failed jobs" ' +
        'reuses it, so re-run all jobs instead'
    );
  }
  if (bundle?.version !== ADMIN_SESSION_VERSION) {
    throw new Error(`unsupported bundle version ${bundle?.version}`);
  }
  if (bundle.baseUrl !== target.baseUrl || bundle.adminUrl !== target.adminUrl) {
    throw new Error(
      `bundle is for ${bundle.baseUrl} / ${bundle.adminUrl}, this run targets ${target.baseUrl} / ${target.adminUrl}`
    );
  }
  if (bundle.authMode !== 'legacy') {
    throw new Error(`auth mode ${bundle.authMode} is not shared, only the legacy login is`);
  }
  for (const [name, token] of [
    ['admin UI', uiToken(bundle)],
    ['admin API', bundle.apiToken],
  ] as const) {
    if (!token) throw new Error(`no ${name} token in the bundle`);
    const exp = readJwtExpiry(token);
    if (exp === undefined) throw new Error(`the ${name} token has no expiry`);
    const hours = ((exp - now) / 3_600_000).toFixed(1);
    if (exp - now < minRemainingMs) {
      throw new Error(
        `the ${name} token expires in ${hours}h; re-run the whole workflow to log in again`
      );
    }
  }
}

export function readAdminSession(file: string): AdminSessionBundle {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error: any) {
    throw new Error(`cannot read the admin session bundle ${file}: ${error?.code ?? error?.name}`);
  }
}

/** Owner-only, written then renamed, like the admin API token file. */
export function writePrivateJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** Leaves the files the setup project would have written, so nothing downstream changes. */
export function installAdminSession(
  bundle: AdminSessionBundle,
  paths: AdminSessionPaths = DEFAULT_PATHS
): void {
  writePrivateJson(paths.storageState, bundle.storageState);
  writePrivateJson(paths.authMode, { authMode: bundle.authMode });
  saveAdminApiToken(bundle.apiToken, bundle.baseUrl);
}
