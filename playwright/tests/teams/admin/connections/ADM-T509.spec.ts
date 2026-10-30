import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';

const configMerchant = new ConfigMerchant();
let processorId = '';

test.describe('@regression feature to validate with the automated test case', () => {
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
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T509 Edicion de conexion eliminada',
    {
      tag: ['@admin', '@smoke', '@preprod', '@admin_ui', '@admin-preprod', '@team_admin'],
    },
    async ({ page, paymentService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('The user verifies PSP connection is shown', async () => {
        await adminConnectionsPage.assertProcessorAdded(processorsConfig.kushkiProcessor.name);
      });

      await test.step('The processor is removed with API', async () => {
        await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
      });

      await test.step('The user verifies PSP connection does not show', async () => {
        await page.reload();
        await adminConnectionsPage.clickOnListActiveProcessors();
        await adminConnectionsPage.assertProcessorNotAdded(processorsConfig.kushkiProcessor.name);
      });
    }
  );
});
