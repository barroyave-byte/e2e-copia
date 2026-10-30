import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const configMerchant = new ConfigMerchant();
let privateKey: string;
let publicKey: string;
let orderToken: string;
let merchantId: string;
let merchantToken: string;

test.describe('@regression Purchase with Pagarme BR', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('BR');
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.pagarmeProcessor,
      merchantId,
      merchantToken
    );
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
  // FIXME This test case is not working because the payment processor is not returning the correct status code. All is processed
  test.fixme('@PI-T1009 Error compra configurada como rechazada procesador Pagarme con usuario invitado', async ({
    page,
  }) => {
    const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');
    const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

    await test.step('The user inserts a credit card "pagarme_rechazada" from DeunaNow', async () => {
      await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
        creditCardData.pagarmeRejectedUnauthorized,
        { country: 'BR' }
      );
    });

    await test.step('The user clicks pay', async () => {
      await paymentDeunaNowPage.clickPay();
    });

    await test.step('Validate that the order status is "denied"', async () => {
      await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);
      await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
      await adminOrderDetailsPage.assertPaymentStatus('denied');
    });
  });
});
