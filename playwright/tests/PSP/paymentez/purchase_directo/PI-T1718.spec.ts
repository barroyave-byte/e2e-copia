import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { paymentezMastercardSuccessful } from '@support/interfaces/credit_cards';

let configMerchant = new ConfigMerchant();

test.describe('@regression Purchase with Kushki EC', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paymentezProcessorEC,
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

  test(
    '@PI-T1718 Realizar pago y validar el JSON de payments',
    {
      tag: [
        '@critical_e2e',
        '@smoke',
        '@payments_integration',
        '@test_base',
        '@team_payment_integration',
        '@admin-preprod',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const postTransactionPage = new PostTransactionPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('User enters debit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(paymentezMastercardSuccessful, {
          country: 'EC',
        });
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('The checkout shows the screen with the order completed and message "¡Gracias por elegirnos!"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
      });

      await test.step('Validate that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validate the payments JSON object', async () => {
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const paymentObject = resultGetOrder.orderPayment.data;

        expect(paymentObject).not.toBeUndefined();
        expect(paymentObject).not.toBeNull();
        expect(paymentObject.amount.currency).toEqual('USD');
        expect(paymentObject.method_type).toEqual('credit_card');
        expect(paymentObject.from_card.card_brand).toEqual('mastercard');
        expect(paymentObject.processor).toEqual('paymentez_direct');
        expect(paymentObject.authorization_code).not.toBeUndefined();
      });

      await test.step('Validate the oderID inside activity table JSON', async () => {
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const orderData = resultGetOrder.bodyResponse;
        await adminOrderDetailsPage.assertFullOrderData(orderData);
      });
    }
  );
});
