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

      await test.step('The user configure MercadoPago connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.mercadopago,
          processorsConfig.mercadoPagoProcessorAuthorize
        );
      });
    }
  );

  test(
    '@ADM-T534 Connection operation edit completes successfully',
    {
      tag: [
        '@preprod',
        '@admin_ui',
        '@admin',
        '@debug',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_admin',
      ],
    },
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

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('user edit active conection', async () => {
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.editProcessorOperation('Purchase');
        await adminConnectionsPage.clickOnConfirmSaveConnection();
        await adminConnectionsPage.waitForEditProcessorResponse();
      });
    }
  );
});
