import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

test.describe('@regression Connections: edit an Apple Pay wallet connection', () => {
  let merchantId: string;
  let merchantToken: string;
  let credentialId: string | undefined;

  test.beforeAll(async ({ walletCredentialsService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    const credential = await walletCredentialsService.createApplePayCredential(
      merchantToken,
      merchantId,
      {
        merchant_name: `ApplePay Before ${Date.now()}`,
        wallet_config: {
          merchant_domains: ['explore.stg.deuna.io'],
          allowed_card_networks: ['visa'],
          allowed_auth_methods: ['supports3DS'],
        },
      }
    );
    credentialId = credential.data.id;
  });

  test(
    '@ADM-T904 Admin - Connections - Edit an Apple Pay wallet connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const merchantName = `ApplePay Edited ${Date.now()}`;
      const merchantDomain = 'pay.stg.deuna.com';

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
            action: 'admin.connections.addMerchantDomain',
            params: { domain: merchantDomain },
          },
          { action: 'admin.connections.saveEditedConnection' },
          { action: 'admin.connections.openProcessorDrawer' },
          {
            action: 'admin.connections.assertApplePayConfiguration',
            params: { merchantName, checkedLabels: ['Mastercard'], merchantDomain },
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
