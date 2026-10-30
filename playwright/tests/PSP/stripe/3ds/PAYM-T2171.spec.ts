import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { ValidateEmailPage } from '@pages/checkout/user_data/validateEmailPage';
import { GuestUserDataPage } from '@pages/checkout/user_data/guestUserDataPage';
import { ShippingDataPage } from '@pages/checkout/shipping_data/shippingDataPage';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { faker } from '@faker-js/faker';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as userData from '@support/interfaces/user_data';
import * as userAddress from '@support/interfaces/address_user';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe('@regression 3DS with payment processor Stripe MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantCheckout.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripe3dsProcessor,
      merchantId,
      merchantToken
    );
  });

  // TODO - This test is failing because the developer has not implemented the logic in staging
  test.fixme(
    '@PAYM-T2171 Transición de estados automatico - Pending 3ds - Denied',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'QA-3180' },
    },
    async ({ page }) => {
      const postTransactionPage = new PostTransactionPage(page);
      const validateEmailPage = new ValidateEmailPage(page);
      const guestUserDataPage = new GuestUserDataPage(page);
      const shippingDataPage = new ShippingDataPage(page);
      const paymentPage = new PaymentPage(page);
      const paymentDeunanowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user opens the testing page and opens the required widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user enters the card details "stripe3ds"', async () => {
        await paymentDeunanowPage.fillCreditCardDataDeunaNow(creditCardData.stripe3dsPass, {
          country: 'MX',
        });
      });

      await test.step('User open Stripes 3DS challenge but dont select any option', async () => {
        const page3DS = page.waitForEvent('popup');
        await paymentDeunanowPage.clickPay();
        await paymentDeunanowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);
        await page3DS;
        (await page3DS).close();
      });

      await test.step('The transaction status in the admin is "pending_3ds"', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('pending_3ds');
      });

      await test.step('The transaction status automatically changes to denied after 2 minutes', async () => {
        await page.waitForTimeout(120000); // TODO - This time is necessary because it is the minimum time possible to see the automatic state change.
        await adminOrderDetailsPage.assertPaymentStatus('denied');
      });
    }
  );
});
