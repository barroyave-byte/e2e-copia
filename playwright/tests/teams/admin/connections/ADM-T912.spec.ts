import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import type { BaseProcessor } from '@support/interfaces/payment_processors';

const connectionName = 'AUTO_STRIPE_CONNECT_PENDING';
const pendingStripeConnectProcessor: BaseProcessor = {
  name: connectionName,
  payment_processor_id: 50,
  enabled: true,
  country_iso: 'MX',
  currency_iso3: 'MXN',
  public_api_key: '',
  private_api_key: '',
  automatic_capture: true,
  enable_3ds_authentication: false,
  extra_params: {
    is_new_account: false,
    use_deuna_credentials: true,
  },
};

test.describe('@regression Connections: display a pending Stripe Connect connection', () => {
  test(
    '@ADM-T912 Admin - Connections - Display a pending Stripe Connect connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: pendingStripeConnectProcessor },
            stepName: 'Create a Stripe Connect connection without completing OAuth',
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          { action: 'admin.navigate.goToConnections' },
          {
            action: 'admin.connections.goToPendingConnectionsTab',
            stepName: 'Open the Pending connections tab',
          },
          {
            action: 'admin.connections.assertPendingProcessor',
            params: { connectionName },
            stepName: 'The Stripe Connect connection is displayed with Pending status',
          },
          {
            action: 'admin.connections.goToActiveConnectionsTab',
            stepName: 'Open the Active connections tab',
          },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
            stepName: 'The pending connection is not displayed as active',
          },
        ],
      });
    }
  );
});
