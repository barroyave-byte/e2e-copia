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

test.describe('@regression Verify AVS switch visibility and persistence in processor connection when AVS is enabled', () => {
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
    '@ADM-T748 Verify AVS switch is visible in processor connection when AVS is enabled',
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

      await test.step('Verify AVS switch does not exist before enabling AVS configuration', async () => {
        await test.step('The user navigates to connections and opens the processor editor', async () => {
          await adminConnectionsPage.openProcessorDrawer();
        });

        await test.step('The user verifies AVS switch is not visible before AVS configuration', async () => {
          await adminConnectionsPage.verifyAvsSwitchNotVisible();
          await adminConnectionsPage.cancelEditProcessor();
        });
      });

      await test.step('Enable AVS configuration', async () => {
        await test.step('The user navigates to error management page', async () => {
          await adminHomePage.goToErrorManagement();
        });

        await test.step('The user clicks on AVS tab to view AVS configuration', async () => {
          await adminAvsPage.clickAvsTab();
        });

        await test.step('The user activates the AVS toggle switch', async () => {
          await adminAvsPage.activateAvsToggle();
        });

        await test.step('The user selects random AVS codes', async () => {
          await adminAvsPage.selectRandomAvsCodeCheckboxes();
        });

        await test.step('The user saves the AVS configuration', async () => {
          await adminAvsPage.saveConfiguration();
        });

        await test.step('The user verifies the success toast appears', async () => {
          await adminAvsPage.verifySuccessToast();
        });
      });

      await test.step('Verify AVS switch is visible in processor connection after enabling AVS', async () => {
        await test.step('The user navigates to connections page and opens the processor editor', async () => {
          await page.reload();
          await navigateAndOpenProcessorDrawer(adminHomePage, adminConnectionsPage);
        });

        await test.step('The user verifies AVS switch is now visible and unchecked by default', async () => {
          await adminConnectionsPage.verifyAvsSwitchIsVisible();
          await adminConnectionsPage.verifyAvsSwitchIsNotChecked();
        });
      });

      await test.step('Activate AVS switch and verify it persists after saving', async () => {
        await test.step('The user activates AVS switch in the processor editor', async () => {
          await adminConnectionsPage.activateAvsSwitch();
        });

        await test.step('The user saves the processor changes', async () => {
          const editProcessorResponse = adminConnectionsPage.waitForEditProcessorResponse();
          await adminConnectionsPage.confirmEditProcessor();
          await editProcessorResponse;
          await adminConnectionsPage.assertConnectionConfigured();
        });

        await test.step('The user reloads the page and opens the processor editor again', async () => {
          await page.reload();
          await adminConnectionsPage.openProcessorDrawer();
        });

        await test.step('The user verifies AVS switch remains checked after reload', async () => {
          await adminConnectionsPage.verifyAvsSwitchIsChecked();
        });
      });
    }
  );
});
