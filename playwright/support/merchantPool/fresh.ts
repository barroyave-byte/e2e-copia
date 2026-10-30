import * as fs from 'fs';
import * as path from 'path';
import envConfig from '@support/envConfig';
import { loadManifest, MANIFEST_ENV_VAR, MerchantPoolManifest } from './manifest';

/**
 * Pre-provisioned single-use merchants (docs/merchant-pool-plan.md, section 4.6).
 *
 * CI creates, before the shard matrix and at a controlled rate, one plain merchant per spec of
 * each shard. When a spec asks for a standard merchant, createBasicMerchant claims one of its
 * shard's instead of creating it. Nothing is shared: a claimed merchant is used by that spec only,
 * exactly like one created on the spot. What changes is when merchant-auth sees the creation.
 *
 * Deliberately free of ServiceFactory imports: MerchantAuthService imports this module.
 */
export interface FreshMerchant {
  merchantId: string;
  merchantName: string;
  privateKey: string;
  publicKey: string;
}

let shardKey: string | undefined;
let manifest: MerchantPoolManifest | undefined | null = null;

/** Set by the merchantPool worker fixture; without it (no fixture, local run) nothing is claimed. */
export function setFreshMerchantShard(shard: number | undefined): void {
  shardKey = shard === undefined ? undefined : String(shard);
}

function currentManifest(): MerchantPoolManifest | undefined {
  if (manifest === null) {
    manifest = loadManifest({ env: envConfig.NODE_ENV, baseUrl: envConfig.BASE_URL_POSTMAN });
  }
  return manifest;
}

/**
 * Claims an unused pre-provisioned merchant of this shard for the country, or returns undefined
 * (no manifest, no shard, none left) so the caller creates one as before. The claim is an
 * exclusive file create: the shard's workers share one machine, so two specs can never get the
 * same merchant.
 */
export function claimFreshMerchant(country: string): FreshMerchant | undefined {
  const manifestPath = process.env[MANIFEST_ENV_VAR];
  const candidates =
    shardKey && manifestPath ? currentManifest()?.fresh?.[shardKey]?.[country] : undefined;
  if (!candidates?.length) return undefined;

  const claims = `${manifestPath}.claims`;
  fs.mkdirSync(claims, { recursive: true });
  for (const merchant of candidates) {
    try {
      fs.closeSync(fs.openSync(path.join(claims, merchant.merchantId), 'wx'));
      return merchant;
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  return undefined;
}

/** For tests: forget the cached manifest and shard. */
export function resetFreshMerchants(): void {
  shardKey = undefined;
  manifest = null;
}
