import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

test.describe('@regression Connections: edit a Google Pay wallet connection', () => {
  let merchantId: string;
  let merchantToken: string;
  let credentialId: string | undefined;

  test.beforeAll(async ({ walletCredentialsService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    const credential = await walletCredentialsService.createGooglePayCredential(
      merchantToken,
      merchantId,
      {
        merchant_name: `GooglePay Before ${Date.now()}`,
        wallet_config: {
          gateway: 'DIRECT',
          allowed_card_networks: ['VISA'],
          allowed_auth_methods: ['CRYPTOGRAM_3DS'],
        },
      }
    );
    credentialId = credential.data.id;
  });

  test(
    '@ADM-T903 Admin - Connections - Edit a Google Pay wallet connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const merchantName = `GooglePay Edited ${Date.now()}`;

      await testing.run({
        step: [
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            params: { merchantId },
          },
          { action: 'admin.navigate.goToConnections' },
          { action: 'admin.connections.openProcessorDrawer' },
          {
            action: 'admin.connections.fillMerchantName',
            params: { name: merchantName },
          },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: 'Mastercard' },
          },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: 'Card Number - FPAN (Pan Only)' },
          },
          { action: 'admin.connections.saveEditedConnection' },
          { action: 'admin.connections.openProcessorDrawer' },
          {
            action: 'admin.connections.assertGooglePayConfiguration',
            params: {
              merchantName,
              checkedLabels: ['Mastercard', 'Card Number - FPAN (Pan Only)'],
            },
          },
        ],
        cleanup: [
          {
            action: 'admin.connections.deleteWalletCredential',
            params: { credentialId, token: merchantToken },
          },
        ],
      });
    }
  );
});
