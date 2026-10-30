import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { getTransactionLogsByTransactionID } from '@support/request_helper/requestUtil';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';

import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { FlagNames, PaymentType, RuleNames } from '@support/interfaces/statsig/statsig';

const configMerchant = new ConfigMerchant();
const configStatsig = new ConfigStatsig();

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('EC');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    await configStatsig.ensureCreateOrUpdateRule(
      FlagNames.ShouldFinishFlowByPaymentType,
      RuleNames.MerchantsThatDontEvaluateCashOrdersTests,
      PaymentType.Cash,
      merchantId
    );
    const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cashProcessorEC,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.sift,
          processorsConfig.siftFraudProcessor
        );
      });

      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1919 Compra cash payments con ShouldFinishFlowByPaymentType Flag como true',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const postTransactionPage = new PostTransactionPage(page);

      await test.step('The user see the payment method Cash', async () => {
        await paymentDeunaNowPage.assertVisibleIfOnlyPaymentMethodIsAPM('Efectivo');
      });

      await test.step('The Statsig rule is live for this merchant', async () => {
        // guard only skips the fraud evaluation once its Statsig client has downloaded the
        // rule written in beforeAll. The setup above covers ~20s of that window, which the
        // measurements showed is not enough; wait out whatever is left before paying.
        // This rule is shared, so a run in flight can evict this merchant from it. The
        // re-apply is registered by the write itself, so there is nothing to pass here.
        await configStatsig.pollUntilRuleIsLive(
          FlagNames.ShouldFinishFlowByPaymentType,
          merchantId
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Order status is validated with the status "pending"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);
      });

      await test.step('Validate the payments JSON object', async () => {
        await page.waitForTimeout(3000);
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const paymentObject = resultGetOrder.orderPayment.data;

        expect(paymentObject).not.toBeUndefined();
        expect(paymentObject).not.toBeNull();
        expect(paymentObject.amount.currency).toEqual('USD');
        expect(paymentObject.method_type).toEqual('cash');
        expect(paymentObject.status).toEqual('pending');
        expect(paymentObject.from_card.card_brand).toEqual('');
        expect(paymentObject.processor).toEqual('cash');
      });

      await test.step('Validate transaction_logs rows attached to this transaction_id', async () => {
        const { body, status, statusText } = await getTransactionLogsByTransactionID(orderId);

        const expectedTransactionLogRowCount = 0;
        expect(status).toBe(202);
        expect(statusText, 'Accepted');
        expect(body.row_count).toBe(expectedTransactionLogRowCount);
        expect(body.data.rows.length).toBe(expectedTransactionLogRowCount);
      });
    }
  );
});
