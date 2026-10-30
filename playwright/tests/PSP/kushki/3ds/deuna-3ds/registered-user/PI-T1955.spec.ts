import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase exitoso - Kushki + DEUNA 3DS - Frictionless - Usuario registrado', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // Register user and set address
    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.cieloVisaSuccessful.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    // Set credit card for user
    await apiCallNewman.setCreditCardForUser(
      userEmail,
      creditCardData.cybersource3dsMastercardFrictionless,
      userAddressCreditCard.userAddressCreditCardMX,
      merchantId,
      privateKey
    );

    // Tokenize order with registered user
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorWithDEUNAThreeDS,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1955 Purchase exitoso - Kushki + DEUNA 3DS - Frictionless - Usuario registrado',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_payment_integration',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user navigates to the payment widget screen as registered user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User logs in', async () => {
        await paymentDeunaNowPage.enterOTPCode();
      });

      await test.step('The user inserts cvv code from credit card "cybersource3dsMastercardFrictionless" from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCvvCode(
          creditCardData.cybersource3dsMastercardFrictionless.cvv_code
        );
      });

      await test.step('The user clicks pay', async () => {
        // The frictionless 3DS is finished by a popup the widget opens after the purchase;
        // leaving for the admin before it calls continue kills it and the order stays in
        // pending_3ds.
        paymentDeunaNowPage.threeDSUrlAwaiter();
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);
        await paymentDeunaNowPage.assert3dsResponseSuccess();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 10, 10000);
      });
    }
  );
});
