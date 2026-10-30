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

  test(
    '@ADM-T730 Connection with Multiple Partial Refund',
    {
      tag: ['@preprod', '@admin_ui', '@admin', '@admin_connection', '@team_admin', '@admin_smoke'],
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

      await test.step('The user configures Prosa connection with Multiple Partial Refund', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.prosa,
          processorsConfig.prosaProcessor
        );
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnActiveProcessorsTab();
      });

      await test.step('The user check Prosa connection info', async () => {
        await adminConnectionsPage.assertProcessorAdded(processorsConfig.prosaProcessor.name);
      });
    }
  );
});
