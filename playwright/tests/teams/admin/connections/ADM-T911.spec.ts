import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

test.describe('@regression Connections: unavailable provider create route shows not found state', () => {
  test(
    '@ADM-T911 Admin - Connections - Display not found state when creating with an unavailable provider',
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
            action: 'admin.connections.goToProcessorCreateRoute',
            params: { providerId: 'non-existent-provider' },
            stepName: 'Open the create route with an unavailable provider ID',
          },
          {
            action: 'admin.connections.assertConnectionFormNotFoundState',
            params: {
              title: 'Proveedor de conexión no encontrado',
              description: 'Regresa a Conexiones y selecciona un proveedor disponible.',
            },
            stepName: 'The provider-not-found state is displayed instead of the create form',
          },
        ],
      });
    }
  );
});
