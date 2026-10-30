import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

test.describe('@regression Connections: unavailable connection edit route shows not found state', () => {
  test(
    '@ADM-T910 Admin - Connections - Display not found state when editing an unavailable connection',
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
            action: 'admin.connections.goToProcessorEditRoute',
            params: { resourceKey: 'non-existent-connection' },
            stepName: 'Open the edit route with an unavailable connection resource key',
          },
          {
            action: 'admin.connections.assertConnectionFormNotFoundState',
            params: {
              title: 'Conexión no encontrada',
              description: 'Regresa a Conexiones y selecciona una conexión disponible.',
            },
            stepName: 'The connection-not-found state is displayed instead of the edit form',
          },
        ],
      });
    }
  );
});
