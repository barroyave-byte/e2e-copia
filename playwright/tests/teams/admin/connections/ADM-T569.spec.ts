import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate Connection operation edit completes successfully', () => {
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
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure BAZ Gateway connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.bazGateway,
          processorsConfig.bazGatewayProcessorConnection
        );
      });
    }
  );

  test(
    '@ADM-T569 Edit 3DS info on Connection',
    {
      tag: [
        '@fixme_admin_preprod',
        '@admin',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
        '@preprod',
        '@admin_ui',
      ],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('The user click on Edit Connection', async () => {
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnEditProcessor();
      });

      await test.step('The user update 3DS info', async () => {
        await adminConnectionsPage.configureDeUna3DS(processorsConfig.bazGatewayDeUna3DS);
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user check 3DS info', async () => {
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assert3DSInfoSaved(processorsConfig.bazGatewayDeUna3DS);
      });
    }
  );
});
