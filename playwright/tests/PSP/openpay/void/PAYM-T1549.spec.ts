const globalAssert = new GlobalAssert();
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as captureData from '@support/interfaces/capture';
import * as refundData from '@support/interfaces/refund';
import * as voidData from '@support/interfaces/void';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

test.describe('@regression Pays with OpenPay MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('OPEN_PAY_PROCESSOR_AUTHORIZE_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
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
    '@PAYM-T1549 Void a una transaccion con estado refunded con OpenPay desde el payment widget',
    {
      tag: [
        '@payments_integration',
        '@flaky',
        '@openpay_fixme_preprod',
        '@team_payment_integration',
        '@preprod',
        '@void',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user inserts a credit card "openpayVisaSuccessful" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.openpayVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
      });

      await test.step('Total order is captured', async () => {
        const captureAmount = 3000; //TODO-CAPTURE-TOTAL
        await apiCallNewman.captureV2(
          captureData.captureSuccess,
          privateKey,
          captureAmount,
          undefined,
          { orderToken }
        );
        await globalAssert.assertTransactionPaymentStatus('captured', privateKey, orderToken);
      });

      await test.step('Total order is refunded', async () => {
        await apiCallNewman.refundOrderV2(refundData.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await globalAssert.assertTransactionPaymentStatus('refunded', privateKey, orderToken);
      });

      await test.step('Error when void is made to refunded order', async () => {
        await apiCallNewman.voidOrder(voidData.errorVoidOrderRefunded, privateKey, 0, orderToken);
      });
    }
  );
});
