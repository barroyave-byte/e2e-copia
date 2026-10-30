import { createHash } from 'crypto';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ProcessorRegistry } from '@support/utils/ProcessorRegistry';
import { MerchantSpec } from './MerchantSpec';
import { ManifestMerchant } from './manifest';

/**
 * Hash of the merchant's processors as the API reports them. `updated_at` is included so an edit
 * of an existing processor (enabled, capture mode, credentials) changes it too, not only adding
 * or deleting one.
 */
export async function processorsSnapshot(
  merchantId: string,
  merchantToken: string
): Promise<string> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const response: any = await paymentService.paymentProcessor(merchantId, merchantToken);
  const processors: any[] = response?.data;
  if (!Array.isArray(processors)) {
    throw new Error(`[merchant-pool] unexpected processors response for merchant ${merchantId}`);
  }
  const rows = processors
    .map((p) => [p.id, p.name, p.enabled, p.deleted_at ?? null, p.updated_at].join('|'))
    .sort();
  return createHash('sha256').update(rows.join('\n')).digest('hex').slice(0, 16);
}

/**
 * Creates a merchant that satisfies the spec: merchant, store, applications and its processors.
 * With `registerForCleanup`, processors of a spec released after the run also go to the
 * ProcessorRegistry, so globalTeardown deletes them if the worker dies before releasing them.
 */
export async function provisionMerchant(
  spec: MerchantSpec,
  { registerForCleanup = false }: { registerForCleanup?: boolean } = {}
): Promise<ManifestMerchant> {
  const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
  const merchant =
    spec.kind === 'checkout'
      ? await merchantAuthService.createBasicMerchantCheckout({ country: spec.country })
      : await merchantAuthService.createBasicMerchant({ country: spec.country });

  // Before the processors, as the vault specs did: dLocal PE declined every purchase (422) when
  // the checkout config and the network came after the processor, and passed with this order
  // (docs section 4.19). Neither recipe touches processors, so the integrity snapshot still
  // describes what the specs must not change.
  if (spec.setup?.checkoutConfigVault) {
    await apiCallNewman.createCheckoutConfigVault(merchant.merchantId, merchant.merchantToken);
  }
  if (spec.setup?.network) {
    await apiCallNewman.createNetwork(merchant.merchantId, merchant.merchantToken);
  }

  const processorIds: string[] = [];
  for (const processor of spec.processors) {
    const id = String(
      await apiCallNewman.createPaymentProcessor(
        processor,
        merchant.merchantId,
        merchant.merchantToken
      )
    );
    processorIds.push(id);
    if (registerForCleanup && spec.releaseProcessorsAfterRun) {
      ProcessorRegistry.getInstance().register(id, merchant.merchantId, merchant.merchantToken);
    }
  }
  if (spec.setup?.paypalWalletCampaign) {
    await ServiceFactory.getService(SERVICE_KEYS.PAYMENT_MSI).createPaypalWalletCampaign(
      merchant.merchantId,
      merchant.merchantToken,
      spec.setup.paypalWalletCampaign
    );
  }

  return {
    merchantId: merchant.merchantId,
    merchantName: merchant.merchantName,
    privateKey: merchant.privateKey,
    publicKey: merchant.publicKey,
    processorIds,
    processorsSnapshot: await processorsSnapshot(merchant.merchantId, merchant.merchantToken),
  };
}

/**
 * Deletes a pooled merchant's processors (releaseProcessorsAfterRun). Every processor is attempted
 * even if one fails; the result says which were released, so callers can report the rest.
 */
export async function releaseProcessors(
  merchant: Pick<ManifestMerchant, 'merchantId' | 'processorIds'>,
  merchantToken: string
): Promise<{ released: string[]; failed: string[] }> {
  const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
  const released: string[] = [];
  const failed: string[] = [];
  for (const id of merchant.processorIds) {
    try {
      await paymentService.deletePaymentProcessor(id, merchant.merchantId, merchantToken);
      ProcessorRegistry.getInstance().unregister(id);
      released.push(id);
    } catch (error) {
      console.error(`[merchant-pool] could not delete processor ${id}: ${error}`);
      failed.push(id);
    }
  }
  return { released, failed };
}
