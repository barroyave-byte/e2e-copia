import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';

const configMerchant = new ConfigMerchant();

test.describe('@regression Connections: disable and re-enable Click to Pay', () => {
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
    '@ADM-T907 Admin - Connections - Disable and re-enable Click to Pay',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const connectionName = 'ClickToPay';

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
            params: { connectionName },
          },
          {
            action: 'admin.connections.disableConnection',
            params: { closeSuccessModal: true },
          },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
          },
          { action: 'admin.connections.goToDisabledConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
          },
          {
            action: 'admin.connections.enableConnection',
            params: { closeSuccessModal: true },
          },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
          },
          { action: 'admin.connections.goToActiveConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName },
          },
          { action: 'admin.connections.goToDisabledConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorNotAdded',
            params: { connectionName },
          },
        ],
      });
    }
  );
});
