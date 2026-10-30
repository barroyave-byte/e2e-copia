import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

const GOOGLE_PAY = 'GooglePay';

test.describe('@regression Connections: create and enable a Google Pay wallet connection', () => {
  test(
    '@ADM-T902 Admin - Connections - Create and enable a Google Pay wallet connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const merchantName = `GooglePay E2E ${Date.now()}`;

      await testing.run({
        step: [
          { action: 'admin.connections.captureCreatedWalletCredential' },
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          { action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId' },
          { action: 'admin.navigate.goToConnections' },
          {
            action: 'admin.connections.searchConnection',
            params: { connectionName: GOOGLE_PAY },
          },
          {
            action: 'admin.connections.selectConnection',
            params: { connectionName: GOOGLE_PAY },
          },
          {
            action: 'admin.connections.selectCredentialFlow',
            params: { mode: 'merchant_managed' },
          },
          { action: 'admin.connections.assertGooglePayMerchantManagedFieldsVisible' },
          {
            action: 'admin.connections.selectCredentialFlow',
            params: { mode: 'deuna_managed' },
          },
          { action: 'admin.connections.assertGooglePayMerchantManagedFieldsHidden' },
          {
            action: 'admin.connections.fillMerchantName',
            params: { name: merchantName },
          },
          { action: 'admin.connections.selectGooglePayDeunaGateway' },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: 'Visa' },
          },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: 'Device Token - DPAN (3DS)' },
          },
          { action: 'admin.connections.submitCreateConnectionForm' },
          { action: 'admin.connections.confirmCreateConnectionDialog' },
          { action: 'admin.connections.goToActiveConnectionsTab' },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName: merchantName },
          },
        ],
        cleanup: [{ action: 'admin.connections.deleteWalletCredential' }],
      });
    }
  );
});
