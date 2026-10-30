import { type FullConfig } from '@support/fixtures';
import { MerchantRegistry } from '@support/utils/MerchantRegistry';
import { ProcessorRegistry } from '@support/utils/ProcessorRegistry';
import { ServiceFactory } from '@support/http/ServiceFactory';
import { SERVICE_KEYS } from '@support/http/types/ServiceTypes';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';

/**
 * Global teardown hook that runs after all tests have completed
 * Performs bulk deletion of merchants created during test execution
 *
 * Benefits:
 * - Reduces API calls by deleting in bulk instead of individually
 * - More efficient cleanup process
 * - Centralized cleanup logic
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n=== Global Teardown Started ===');

  // Runs in all environments — webhook slots are not environment-specific
  await cleanupOrphanedProcessors();

  // Only run cleanup in preprod environment
  if (envConfig.NODE_ENV !== allowedEnvironments.PRE_PRODUCTION) {
    console.log(
      `[INFO] Skipping merchant cleanup - not in preprod environment (current: ${envConfig.NODE_ENV})`
    );
    return;
  }

  // Validate required environment variables
  if (!envConfig.PERMIT_TOKEN) {
    console.error('[ERROR] PERMIT_TOKEN is not configured. Cannot perform merchant cleanup.');
    return;
  }

  try {
    const merchantRegistry = MerchantRegistry.getInstance();
    const merchantIds = merchantRegistry.getAll();

    if (merchantIds.length === 0) {
      console.log('[INFO] No merchants to clean up. Registry is empty.');
      return;
    }

    console.log(`[INFO] Found ${merchantIds.length} merchant(s) to delete`);

    // Get PermitService instance
    const permitService = ServiceFactory.getService(
      SERVICE_KEYS.PERMIT_IO,
      envConfig.BASE_URL_PERMIT_IO
    );

    // Perform bulk deletion
    await permitService.bulkDeleteMerchants(merchantIds, envConfig.PERMIT_TOKEN);

    // Clear the registry after successful deletion
    merchantRegistry.clear();
    console.log('[SUCCESS] Merchant cleanup completed successfully');
  } catch (error) {
    console.error('[ERROR] Failed to perform merchant cleanup:', error);
    console.error(
      '[ERROR] Stack trace:',
      error instanceof Error ? error.stack : 'No stack trace available'
    );

    // Don't throw - we don't want to fail the entire test run if cleanup fails
    // Just log the error and continue
  }

  console.log('=== Global Teardown Completed ===\n');
}

async function cleanupOrphanedProcessors() {
  const registry = ProcessorRegistry.getInstance();
  const orphans = registry.getOrphaned();
  const notDeleted: typeof orphans = [];

  if (orphans.length > 0) {
    console.log(
      `[GLOBAL TEARDOWN] Found ${orphans.length} orphaned processor(s) — worker(s) likely killed mid-test.`
    );
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    // Authenticate to get a fresh admin token. Tokens logged in the registry might have expired by teardown time.
    const merchantAuthService = ServiceFactory.getService(SERVICE_KEYS.MERCHANT_AUTH);
    let freshToken = '';
    try {
      const loginResponse = await merchantAuthService.merchantLogin(ADMIN_CREDENTIALS);
      freshToken = loginResponse.token;
      console.log('[GLOBAL TEARDOWN] Successfully generated fresh admin token for cleanup.');
    } catch (error) {
      console.warn(
        '[GLOBAL TEARDOWN] Could not generate fresh admin token. Falling back to logged tokens.',
        error
      );
    }

    for (const { processorId, merchantId, merchantToken } of orphans) {
      try {
        const tokenToUse = freshToken || merchantToken;
        await paymentService.deletePaymentProcessor(processorId, merchantId, tokenToUse);
        console.log(`[GLOBAL TEARDOWN] Deleted orphaned processor ${processorId}`);
      } catch (error) {
        console.warn(
          `[GLOBAL TEARDOWN] Could not delete orphaned processor ${processorId}:`,
          error
        );
        notDeleted.push({ processorId, merchantId, merchantToken });
      }
    }
  }

  registry.clear();
  // Kept for the next run's teardown: a PayPal processor left behind holds one of the app's 10
  // webhook slots, and a failed DELETE (a 5xx from staging) is usually gone by then.
  for (const { processorId, merchantId, merchantToken } of notDeleted) {
    registry.register(processorId, merchantId, merchantToken);
  }
  if (notDeleted.length) {
    console.warn(
      `[GLOBAL TEARDOWN] ${notDeleted.length} processor(s) kept for the next run's teardown`
    );
  }
}

export default globalTeardown;
