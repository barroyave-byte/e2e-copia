import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';

const configMerchant = new ConfigMerchant();

test.describe('@regression Connections: display an active Click to Pay connection', () => {
  let merchantId: string;

  test.beforeAll(async ({ checkoutConfigurationService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    const theme = getCustomThemeConfig({});

    await checkoutConfigurationService.configClickToPay(merchantId, merchant.merchantToken, [
      { id: 'test', name: 'default', config: JSON.stringify(theme) },
    ]);
  });

  test(
    '@ADM-T906 Admin - Connections - Display an active Click to Pay connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            params: { merchantId },
          },
          { action: 'admin.navigate.goToConnections' },
          { action: 'admin.connections.goToActiveConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName: 'ClickToPay' },
          },
          { action: 'admin.connections.goToDisabledConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName: 'ClickToPay' },
          },
        ],
      });
    }
  );
});
