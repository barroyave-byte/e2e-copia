import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

const APPLE_PAY = 'ApplePay';

test.describe('@regression Connections: create and enable an Apple Pay wallet connection', () => {
  test(
    '@ADM-T901 Admin - Connections - Create and enable an Apple Pay wallet connection',
    { tag: ['@admin', '@admin_connection', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const merchantName = `ApplePay E2E ${Date.now()}`;
      const walletMerchantId = 'merchant.test-1.io.deuna.dev.pay';

      await testing.run({
        step: [
          { action: 'admin.connections.captureCreatedWalletCredential' },
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
            stepName: 'Log in as admin and select the merchant',
          },
          {
            action: 'admin.navigate.goToConnections',
            stepName: 'Navigate to Connections',
          },
          {
            action: 'admin.connections.searchConnection',
            params: { connectionName: APPLE_PAY },
            stepName: 'Search for ApplePay in the Descubrir tab',
          },
          {
            action: 'admin.connections.selectConnection',
            params: { connectionName: APPLE_PAY },
            stepName: 'Click the ApplePay connect button',
          },
          {
            action: 'admin.connections.assertApplePayInitialConfiguration',
            stepName: 'The required Apple Pay fields are visible with no credential flow selected',
          },
          {
            action: 'admin.connections.selectCredentialFlow',
            params: { mode: 'merchant_managed' },
            stepName: 'Select "Manejado por el comercio"',
          },
          {
            action: 'admin.connections.assertMerchantManagedFieldsVisible',
            stepName: 'The 4 certificate fields appear',
          },
          {
            action: 'admin.connections.selectCredentialFlow',
            params: { mode: 'deuna_managed' },
            stepName: 'Select "Manejado por DEUNA"',
          },
          {
            action: 'admin.connections.assertMerchantManagedFieldsHidden',
            stepName: 'The 4 certificate fields disappear',
          },
          {
            action: 'admin.connections.fillMerchantName',
            params: { name: merchantName },
            stepName: 'Fill the merchant name',
          },
          {
            action: 'admin.connections.fillWalletMerchantId',
            params: { id: walletMerchantId },
            stepName: 'Fill the Apple Pay merchant identifier',
          },
          {
            action: 'admin.connections.addMerchantDomain',
            params: { domain: 'explore.stg.deuna.io' },
            stepName: 'Add the merchant domain',
          },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: 'Visa' },
            stepName: 'Check the Visa card network',
          },
          {
            action: 'admin.connections.selectConfigurationCheckbox',
            params: { label: '3DS' },
            stepName: 'Check the 3DS authentication method',
          },
          {
            action: 'admin.connections.submitCreateConnectionForm',
            stepName: 'Click "Conectar"',
          },
          {
            action: 'admin.connections.confirmCreateConnectionDialog',
            stepName: 'Confirm in the dialog',
          },
          {
            action: 'admin.connections.goToActiveConnectionsTab',
            stepName: 'Open the Activos tab',
          },
          {
            action: 'admin.connections.assertProcessorAdded',
            params: { connectionName: merchantName },
            stepName: 'The new Apple Pay connection appears in the list',
          },
        ],
        cleanup: [{ action: 'admin.connections.deleteWalletCredential' }],
      });
    }
  );
});
