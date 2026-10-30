import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase with Conekta Spreedly', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ userAuthService, emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.conektaMasterCardSuccessful.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      creditCardData.conektaMasterCardSuccessful,
      userAddressCreditCard.userAddressCreditCardMX,
      merchantId,
      privateKey
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.conektaSpreedlyProcessor,
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
    '@PAYM-T710 Purchase con tarjeta tokenizada + Spreedly',
    {
      tag: [
        '@critical_e2e',
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCvvCode(creditCardData.conektaMasterCardSuccessful.cvv_code);
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
