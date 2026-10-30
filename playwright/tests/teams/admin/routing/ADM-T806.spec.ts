import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyApmsPage } from '@pages/admin/payment_strategies/adminPaymentStrategyApmsPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { deletePaymentProcessor } from '@tests/wallet/paypal_wallet/common';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing APMs rules', () => {
  let processorId = '';
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalWalletProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T806 Comercio + APM + Motor compatibles',
    { tag: ['@admin', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminPaymentStrategyApmsPage = new AdminPaymentStrategyApmsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure cybersource connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.cybersourceFraud,
          processorsConfig.cybersourceFraudProcessor
        );
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user Click on the APM tab', async () => {
        await adminPaymentStrategyApmsPage.selectAlternativePaymentMethodTab();
      });
      await test.step('The user create APM default rule width fraud + apm', async () => {
        await adminPaymentStrategyApmsPage.createDefaultAPMRule(true);
      });

      await test.step('The user verify APM default rule created', async () => {
        await adminPaymentStrategyApmsPage.verifyDefaultAPMRuleCreated();
      });
    }
  );
  test.afterAll(async () => {
    await deletePaymentProcessor(processorId, merchantId, merchantToken);
  });
});
