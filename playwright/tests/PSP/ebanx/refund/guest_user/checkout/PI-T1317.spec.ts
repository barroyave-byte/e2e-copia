import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { faker } from '@faker-js/faker';
import * as userAddress from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userData from '@support/interfaces/user_data';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression EBANX Refund BR', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    orderId = new Date().getTime().toString();
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      order_id: `${orderId}`,
      billing_address1: '1230',
      billing_address2: '1230',
      billing_identity_document: '11960610767',
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.createEbanxProcessor('BR', false, 'BRL'),
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
    '@PI-T1317 Refund exitoso Visa con EBANX en Brazil',
    {
      tag: ['@payments_integration', '@fix_ebanx_preprod', '@team_payment_integration', '@preprod'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('The user enters the credit card information of the EBANX Visa', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.ebanxVisaSuccessful, {
          country: 'BR',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validate total refund to transaction processed', async () => {
        await adminOrderDetailsPage.refundTotalOrder();
        await adminOrderDetailsPage.assertPaymentStatus('refunded');
        const status = 'refunded';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
