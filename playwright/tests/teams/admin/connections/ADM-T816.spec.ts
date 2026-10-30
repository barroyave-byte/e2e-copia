import { expect } from '@playwright/test';

import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

const ANTI_FRAUD_FIELDS = {
  key: 'Key',
  sharedSecret: 'Shared Secret',
  review3ds: 'Use “Review” status for 3DS (Yes or No)',
  review3dsMetadataId: 35,
} as const;

interface UpdateAntiFraudPayload {
  enabled: boolean;
  processor_id: string;
  merchant_profile: {
    merchant_id: string;
    processor_id: number;
  };
  credentials: Array<{
    metadata_id: number;
    value: string;
  }>;
}

test.describe('@regression Anti-fraud connection edit', () => {
  let merchantId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
  });

  test(
    '@ADM-T816 Edit an anti-fraud connection without overwriting unchanged masked credentials',
    {
      tag: ['@admin', '@admin_connection', '@team_admin', '@regression'],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user logs in and opens Connections', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures a Cybersource anti-fraud connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.cybersourceFraud,
          processorsConfig.cybersourceFraudProcessor
        );
      });

      await test.step('The user opens the Cybersource anti-fraud connection for editing', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
        await adminConnectionsPage.searchConnection(ConnectionsAvailable.cybersourceFraud);
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnEditProcessor();
      });

      await test.step('Focusing another property does not clear masked credentials', async () => {
        const maskedKey = await adminConnectionsPage.getAntiFraudPropertyValue(
          ANTI_FRAUD_FIELDS.key
        );
        const maskedSharedSecret = await adminConnectionsPage.getAntiFraudPropertyValue(
          ANTI_FRAUD_FIELDS.sharedSecret
        );

        expect(maskedKey).toMatch(/\*{4,}/);
        expect(maskedSharedSecret).toMatch(/\*{4,}/);

        await adminConnectionsPage.focusAntiFraudProperty(ANTI_FRAUD_FIELDS.review3ds);

        await adminConnectionsPage.assertAntiFraudPropertyValue(ANTI_FRAUD_FIELDS.key, maskedKey);
        await adminConnectionsPage.assertAntiFraudPropertyValue(
          ANTI_FRAUD_FIELDS.sharedSecret,
          maskedSharedSecret
        );
      });

      await test.step('The PUT sends only the modified anti-fraud property', async () => {
        const updateRequestPromise = page.waitForRequest((request) => {
          const isPut = request.method() === 'PUT';
          const url = new URL(request.url());
          const isCorrectPath = url.pathname.endsWith(`/merchant/${merchantId}/profile`);
          return isPut && isCorrectPath;
        });
        const connectionsResponsePromise = adminConnectionsPage.waitForEditProcessorResponse(
          `merchant/${merchantId}/profile`
        );

        await adminConnectionsPage.fillAntiFraudProperty(ANTI_FRAUD_FIELDS.review3ds, 'yes');
        await adminConnectionsPage.confirmEditProcessor();

        const [updateRequest] = await Promise.all([
          updateRequestPromise,
          connectionsResponsePromise,
        ]);
        const payload = updateRequest.postDataJSON() as UpdateAntiFraudPayload;

        await adminConnectionsPage.assertConnectionConfigured();

        expect(payload.enabled).toBe(true);
        expect(payload.merchant_profile.merchant_id).toBe(merchantId);
        expect(payload.processor_id).toBe(payload.merchant_profile.processor_id);
        // This assertion is the most important one, as it verifies that the PUT request only contains the modified property and does not include the masked credentials.
        expect(payload.credentials).toStrictEqual([
          { metadata_id: ANTI_FRAUD_FIELDS.review3dsMetadataId, value: 'yes' },
        ]);
      });

      await test.step('The updated property persists and credentials remain masked', async () => {
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertAntiFraudPropertyValue(ANTI_FRAUD_FIELDS.review3ds, 'yes');
        await adminConnectionsPage.assertAntiFraudCredentialIsMasked(ANTI_FRAUD_FIELDS.key);
        await adminConnectionsPage.assertAntiFraudCredentialIsMasked(
          ANTI_FRAUD_FIELDS.sharedSecret
        );
      });
    }
  );
});
