import { test } from '@support/fixtures';
import type { BaseProcessor } from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { TestingFramework } from 'playwright/framework/core';

const connectionName = `STRIPE_OAUTH_E2E_${Date.now()}`;
const stripeOAuthProcessor: BaseProcessor = {
  name: connectionName,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  payment_processor_id: 50,
  enabled: true,
  country_iso: 'MX',
  currency_iso3: 'MXN',
  automatic_capture: true,
};

test.describe('@regression Connections: create a Stripe OAuth connection', () => {
  test(
    '@ADM-T914 Admin - Connections - Create a Stripe OAuth connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          {
            action: 'admin.navigate.goToConnections',
            stepName: 'Open the Connections page',
          },
          {
            action: 'admin.connections.configureConnection',
            params: {
              connectionName: ConnectionsAvailable.stripe,
              processorData: stripeOAuthProcessor,
            },
            stepName:
              'Complete the Stripe account wizard, skip Stripe test onboarding, and confirm the connection was created',
          },
        ],
      });
    }
  );
});