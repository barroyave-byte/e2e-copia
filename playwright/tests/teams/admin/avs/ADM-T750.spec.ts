import { test } from '@support/fixtures';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminAvsPage } from '@pages/admin/adminAvsPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import {
  setupAvsTestEnvironment,
  navigateAndOpenProcessorDrawer,
} from '@support/helpers/avsHelpers';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression Verify AVS switch visibility in processor connection when AVS is disabled', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.amexProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T750 Verify AVS switch is not visible in processor connection when AVS is disabled',
    { tag: ['@admin', '@team_admin', '@admin_smoke', '@preprod', '@admin_ui'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminAvsPage = new AdminAvsPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');

      await test.step('Setup test environment and configure processor connection', async () => {
        await setupAvsTestEnvironment(
          adminLoginPage,
          adminHomePage,
          adminConnectionsPage,
          merchantId
        );
      });

      await test.step('Ensure AVS configuration is disabled', async () => {
        await test.step('The user navigates to error management page', async () => {
          await adminHomePage.goToErrorManagement();
        });

        await test.step('The user clicks on AVS tab to view AVS configuration', async () => {
          await adminAvsPage.clickAvsTab();
        });

        await test.step('The user deactivates AVS toggle if it is active', async () => {
          await adminAvsPage.deactivateAvsToggleIfActive();
        });

        await test.step('The user verifies AVS toggle is deactivated', async () => {
          await adminAvsPage.verifyAvsToggleIsDeactivated();
        });
      });

      await test.step('Verify AVS switch is not visible in processor connection when AVS is disabled', async () => {
        await test.step('The user navigates to connections page and opens processor drawer', async () => {
          await navigateAndOpenProcessorDrawer(adminHomePage, adminConnectionsPage);
        });

        await test.step('The user verifies AVS switch is not visible in the connection', async () => {
          await adminConnectionsPage.verifyAvsSwitchNotVisible();
        });
      });
    }
  );
});
