import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

const PROCESSOR_DESCRIPTOR_URL = '**/payments-sst/processors/descriptor**';

test.describe('@regression Connections: Descubrir tab shows an error state and recovers via retry', () => {
  test(
    '@ADM-T900 Admin - Connections - Discover tab shows an error state and recovers via retry',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'admin.mocks.failRequests',
            params: {
              urlPattern: PROCESSOR_DESCRIPTOR_URL,
              status: 500,
            },
            stepName: 'Keep the processor catalog unavailable through automatic retries',
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          {
            action: 'admin.navigate.goToConnections',
            stepName: 'Navigate to Connections (Descubrir tab, catalog request fails)',
          },
          {
            action: 'admin.connections.assertDiscoverErrorVisible',
            stepName: 'The Descubrir tab shows the error state instead of the connector list',
          },
          {
            action: 'admin.mocks.restoreRequests',
            params: { urlPattern: PROCESSOR_DESCRIPTOR_URL },
            stepName: 'Restore the processor catalog before retrying',
          },
          {
            action: 'admin.connections.clickRetryOnDiscoverError',
            stepName: 'Click the retry action',
          },
          {
            action: 'admin.connections.assertDiscoverErrorHidden',
            stepName: 'The error state is gone',
          },
          {
            action: 'admin.connections.assertConnectionAvailable',
            params: { connectionName: 'Stripe' },
            stepName: 'The connector catalog is displayed after retry',
          },
        ],
      });
    }
  );
});
