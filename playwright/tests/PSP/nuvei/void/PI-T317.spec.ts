import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationVoid from '@support/interfaces/void';
import * as validationCapture from '@support/interfaces/capture';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

test.describe('@regression Void with processor Nuvei MX from payment widget', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('NUVEI_PROCESSOR_AUTHORIZE_MX');
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
    '@PI-T317 Void a una transaccion con estado captured',
    {
      tag: [
        '@preprod',
        '@void',
        '@payments_integration',
        '@team_payment_integration',
        '@healthcheck',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card "nuvei exitosa" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.nuveiMasterCardSucessfull,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await adminOrderDetailsPage.captureTotalOrder();
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validate error when trying to void transaction with status captured', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderCaptured,
          privateKey,
          0,
          orderToken
        ); //TODO review Erika
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
