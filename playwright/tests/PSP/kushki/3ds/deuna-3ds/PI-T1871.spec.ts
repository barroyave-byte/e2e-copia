import { test } from '@support/fixtures';

import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const globalAssert = new GlobalAssert();

let merchantConfig;
let order;

test.describe('@regression 3DS with DEUNA 3DS and payment processor Kushki', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    order = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey, {
      amount: 300000,
    });
    orderToken = order.data.token;
    orderId = order.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1871 DEUNA 3DS + Kushki - Purchase fallido frictionless',
    {
      tag: [
        '@payments_integration',
        '@test_base',
        '@smoke',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsVisaFailedlFrictionlessAuthentication,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        // The frictionless 3DS is finished by a popup the widget opens after the purchase;
        // leaving for the admin before it calls continue leaves the order in pending_3ds.
        paymentDeunaNowPage.threeDSUrlAwaiter();
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);
        await paymentDeunaNowPage.waitForThreeDsFlowToFinish();
      });

      await test.step('It is validated that the order has been processed successfully with status denied', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied', 8, 9000);
      });
    }
  );
});
