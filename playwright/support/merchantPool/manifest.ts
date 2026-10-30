import * as fs from 'fs';
import type { FreshMerchant } from './fresh';

export const MANIFEST_ENV_VAR = 'MERCHANT_POOL_MANIFEST';
export const MANIFEST_VERSION = 1;

/** One provisioned merchant. The admin token is not stored: each worker gets its own. */
export interface ManifestMerchant {
  merchantId: string;
  merchantName: string;
  privateKey: string;
  publicKey: string;
  processorIds: string[];
  /** processorsSnapshot() right after provisioning; the integrity check compares against it. */
  processorsSnapshot: string;
}

export interface MerchantPoolManifest {
  version: number;
  /** envConfig.NODE_ENV and BASE_URL_POSTMAN of the run that provisioned it. */
  env: string;
  baseUrl: string;
  createdAt: string;
  entries: Record<string, { fingerprint: string; replicas: ManifestMerchant[] }>;
  /**
   * Single-use merchants by shard and country (see fresh.ts). Plain merchants only: a checkout
   * merchant is a plain one plus a checkout configuration, which is not merchant-auth's.
   */
  fresh?: Record<string, Record<string, FreshMerchant[]>>;
}

/**
 * Loads the manifest named by MERCHANT_POOL_MANIFEST, or returns undefined when there is none
 * (local runs, develop, preprod). A manifest from another environment or base URL is rejected
 * rather than used: its merchants do not exist there.
 */
export function loadManifest(
  expected: { env: string; baseUrl: string },
  path: string | undefined = process.env[MANIFEST_ENV_VAR]
): MerchantPoolManifest | undefined {
  if (!path) return undefined;
  const manifest = JSON.parse(fs.readFileSync(path, 'utf8')) as MerchantPoolManifest;
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(
      `[merchant-pool] ${path} has version ${manifest.version}, expected ${MANIFEST_VERSION}`
    );
  }
  if (manifest.env !== expected.env || manifest.baseUrl !== expected.baseUrl) {
    throw new Error(
      `[merchant-pool] ${path} was provisioned for ${manifest.env} (${manifest.baseUrl}), ` +
        `but this run targets ${expected.env} (${expected.baseUrl}). Unset ${MANIFEST_ENV_VAR} ` +
        'or provision a manifest for this environment.'
    );
  }
  return manifest;
}

export function writeManifest(path: string, manifest: MerchantPoolManifest): void {
  // The file carries merchant private keys: readable by the owner only.
  fs.writeFileSync(path, JSON.stringify(manifest, null, 2), { mode: 0o600 });
}
