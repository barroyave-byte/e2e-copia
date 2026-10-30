import { createHash } from 'crypto';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { BaseProcessor } from '@support/interfaces/payment_processors/baseProcessor';

/**
 * What a test needs from its merchant, declared instead of built step by step. Two specs that
 * declare the same MerchantSpec get the same merchant from the pool (see docs/merchant-pool-plan.md).
 *
 * Only declare a spec whose test leaves the merchant as it found it: it may create orders and pay,
 * capture, refund or void them, but never change merchant-level configuration (routing, campaigns,
 * networks, vault/checkout config, processors), neither through the API nor through the admin UI.
 * The integrity check catches processor changes; it cannot see the rest.
 */
export interface MerchantSpec {
  country: CountryCodes;
  /** `checkout` also creates the checkout configuration (ConfigMerchantCheckout). */
  kind: 'plain' | 'checkout';
  processors: readonly BaseProcessor[];
  /**
   * How many merchants CI provisions for this spec. Spec files spread over the replicas by hash,
   * so a high value lowers how many concurrent purchases one merchant receives. Local runs ignore it: each
   * worker provisions its own merchant, which only that worker uses.
   */
  replicas?: number;
  /**
   * The processors hold an external, scarce resource and must be deleted when the run ends. PayPal
   * registers one webhook per processor and its app allows 10, shared by every environment: a
   * pooled processor nobody deletes keeps a slot forever. Workers delete the ones they provisioned
   * on teardown; CI deletes the manifest's in cleanup-merchant-pool (cli/release.ts).
   */
  releaseProcessorsAfterRun?: boolean;
  /**
   * Merchant configuration applied once, when the merchant is provisioned, instead of by each spec
   * (two specs applying it at once on one merchant race: CHKCONFIG-4106). Only configuration that
   * is the same for every spec that needs it (scripts/merchant-pool/lib/eligibility.ts, RECIPE_CALLS):
   * - network: apiCallNewman.createNetwork(), a network of its own with the merchant in it.
   * - checkoutConfigVault: apiCallNewman.createCheckoutConfigVault() with its default config.
   * - paypalWalletCampaign: paymentMsiService.createPaypalWalletCampaign() in that currency, after
   *   the processors, as the specs created it.
   * Part of the fingerprint: an entry with a recipe never hands out the plain entry's merchant.
   */
  setup?: { network?: boolean; checkoutConfigVault?: boolean; paypalWalletCampaign?: string };
}

/** Stable JSON: object keys sorted, so the same config always hashes the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Identifies a MerchantSpec by content. It hashes the whole processor config, not just its name:
 * several configs share a name (stripeProcessor and stripeProcessorAuthorize are both STRIPE) and
 * differ in capture mode or credentials. The hash never exposes those credentials.
 */
export function fingerprint(spec: MerchantSpec): string {
  const processors = spec.processors.map(canonical).sort();
  return (
    createHash('sha256')
      // `setup` only when present: entries without a recipe keep the fingerprint they always had.
      .update(canonical({ country: spec.country, kind: spec.kind, processors, setup: spec.setup }))
      .digest('hex')
      .slice(0, 16)
  );
}
