import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Connections: disable a connection and re-enable it from the Disabled tab', () => {
  test(
    '@ADM-T899 Admin - Connections - View Disabled tab and re-enable a connection',
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
            stepName: 'Provision a merchant with one enabled connection',
          },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          {
            action: 'admin.navigate.goToConnections',
            stepName: 'Navigate to Connections',
          },
          {
            action: 'admin.connections.goToActiveConnectionsTab',
            stepName: 'Open the Activos tab',
          },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
            stepName: 'The connection is visible in Activos',
          },
          {
            action: 'admin.connections.disableConnection',
            stepName: 'Open the row menu, click Deshabilitar and confirm the modal',
          },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
            stepName: 'The connection no longer appears in Activos',
          },
          {
            action: 'admin.connections.goToDisabledConnectionsTab',
            stepName: 'Open the Deshabilitados tab',
          },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
            stepName: 'The connection now appears in Deshabilitados',
          },
          {
            action: 'admin.connections.enableConnection',
            stepName: 'Open the row menu, click Habilitar and confirm the modal',
          },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
            stepName: 'The connection no longer appears in Deshabilitados',
          },
          {
            action: 'admin.connections.goToActiveConnectionsTab',
            stepName: 'Open the Activos tab',
          },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
            stepName: 'The connection appears in Activos again',
          },
        ],
      });
    }
  );
});
