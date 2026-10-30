import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate Connection operation completes successfully', () => {
  let adminLoginPage: AdminLoginPage;
  let adminHomePage: AdminHomePage;
  let adminConnectionsPage: AdminConnectionsPage;

  let merchantId: string;

  let merchantName: string;

  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });
  test.beforeEach(
    'Setup: Configure Kushki connection for Multiple Partial Capture edit testing',
    async ({ page }) => {
      adminLoginPage = new AdminLoginPage(page);
      adminHomePage = new AdminHomePage(page);
      adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure Kushki connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.kushki,
          processorsConfig.kushkiProcessorAuthorize
        );
      });
    }
  );

  test(
    '@ADM-T703 Edit Multiple Partial Capture in Connection',
    {
      tag: ['@admin', '@admin_smoke', '@admin_connection', '@team_admin', '@preprod', '@admin_ui'],
    },
    async ({ page }) => {
      await test.step('The user opens the admin page', async () => {
        await adminLoginPage.gotoAdmin();
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('The user clicks on Edit Connection', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessor();
      });

      await test.step('The user configure Kushki connection with Multiple Partial Capture', async () => {
        await adminConnectionsPage.configureDeUnaMultiplePartialCapture(
          processorsConfig.kushkiProcessorAuthorizeMPC
        );
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user verifies Kushki Multiple Partial Capture configuration is saved', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertDeUnaMultiplePartialCaptureInfoSaved(
          processorsConfig.kushkiProcessorAuthorizeMPC
        );
      });

      await test.step('The user updates cut off Multiple Partial Capture', async () => {
        await adminConnectionsPage.updateCutOffMultiplePartialCapture(
          processorsConfig.kushkiProcessorAuthorizeMPCNewInfo
        );
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user verifies updated cut off Multiple Partial Capture configuration', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertDeUnaMultiplePartialCaptureInfoSaved(
          processorsConfig.kushkiProcessorAuthorizeMPCNewInfo
        );
      });
    }
  );
});
