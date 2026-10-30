import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

const CONNECTIONS_LIST_URL = '**/merchants/*/stores/all/processors**';

test.describe('@regression Connections: Active list shows an error state and recovers via retry', () => {
  test(
    '@ADM-T909 Admin - Connections - Active connections list shows an error state and recovers via retry',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const connectionName = processorsConfig.stripeProcessor.name;

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.stripeProcessor },
            stepName: 'Provision a merchant with one active connection',
          },
          {
            action: 'admin.mocks.failRequests',
            params: {
              urlPattern: CONNECTIONS_LIST_URL,
              status: 500,
            },
            stepName: 'Keep the connections list unavailable through automatic retries',
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          { action: 'admin.navigate.goToConnections' },
          {
            action: 'admin.connections.goToActiveConnectionsTab',
            stepName: 'Open the Activos tab while the connections request fails',
          },
          {
            action: 'admin.connections.assertConnectionsTableErrorVisible',
            stepName: 'The connections table error state is visible',
          },
          {
            action: 'admin.mocks.restoreRequests',
            params: { urlPattern: CONNECTIONS_LIST_URL },
            stepName: 'Restore the connections list before retrying',
          },
          {
            action: 'admin.connections.clickRetryOnConnectionsTableError',
            stepName: 'Retry after the mocked failures are exhausted',
          },
          {
            action: 'admin.connections.assertConnectionsTableErrorHidden',
            stepName: 'The connections table error state disappears',
          },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
            stepName: 'The active connection is displayed after recovery',
          },
        ],
      });
    }
  );
});
