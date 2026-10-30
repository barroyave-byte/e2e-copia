import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate Connection operation completes successfully', () => {
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
    'Setup: Configure Prosa connection for Multiple Partial Refund edit testing',
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and sets merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures Prosa connection with Multiple Partial Refund', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.prosa,
          processorsConfig.prosaProcessor
        );
      });
    }
  );

  test(
    '@ADM-T731 Edit Multiple Partial Refund in Connection',
    {
      tag: ['@preprod', '@admin_ui', '@admin', '@admin_connection', '@team_admin', '@admin_smoke'],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

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

      await test.step('The user configures Prosa connection with Multiple Partial Refund', async () => {
        await adminConnectionsPage.configureDeUnaMultiplePartialRefund(
          processorsConfig.prosaProcessor
        );
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user verifies Prosa Multiple Partial Refund configuration is saved', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertDeUnaMultiplePartialRefundInfoSaved(
          processorsConfig.prosaProcessor
        );
      });

      await test.step('The user updates cut off Multiple Partial Refund', async () => {
        await adminConnectionsPage.updateCutOffMultiplePartialRefund(
          processorsConfig.prosaProcessorAuthorizeMPRNewInfo
        );
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user verifies updated cut off Multiple Partial Refund configuration', async () => {
        await adminConnectionsPage.clickOnButtonOptionsProcessor();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertDeUnaMultiplePartialRefundInfoSaved(
          processorsConfig.prosaProcessorAuthorizeMPRNewInfo
        );
      });
    }
  );
});
