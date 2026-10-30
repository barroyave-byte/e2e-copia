import * as fs from 'fs';
import * as path from 'path';
import { ADMIN_API_TOKEN_FILE_PATH } from '@support/constants/authFile';
import { readJwtExpiry } from './ExpiringTokenCache';

/** Overrides the file location; the unit tests point it at a temp dir. */
export const ADMIN_API_TOKEN_FILE_ENV = 'ADMIN_API_TOKEN_FILE';

/** Same margin as ExpiringTokenCache: a token this close to expiry is not handed out. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const filePath = () => process.env[ADMIN_API_TOKEN_FILE_ENV] || ADMIN_API_TOKEN_FILE_PATH;

/**
 * Written once per shard by the setup project, before any worker starts (Playwright runs the
 * project dependency first), so no locking is needed. Owner-only, written then renamed so a reader
 * never sees half a file. The base URL is stored with the token: a file left from a run against
 * another environment is never used.
 */
export function saveAdminApiToken(token: string, baseUrl: string): void {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ token, baseUrl, savedAt: new Date().toISOString() }), {
    mode: 0o600,
  });
  fs.renameSync(tmp, file);
}

/**
 * The setup project's token for this base URL, or undefined (no file, another environment, about
 * to expire, unreadable) so the caller logs in itself as before.
 */
export function readAdminApiToken(
  baseUrl: string,
  now: () => number = Date.now
): string | undefined {
  try {
    const saved = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (saved?.baseUrl !== baseUrl || typeof saved?.token !== 'string') return undefined;
    const exp = readJwtExpiry(saved.token);
    return exp !== undefined && now() < exp - EXPIRY_MARGIN_MS ? saved.token : undefined;
  } catch {
    return undefined; // no setup token: the worker logs in itself
  }
}
