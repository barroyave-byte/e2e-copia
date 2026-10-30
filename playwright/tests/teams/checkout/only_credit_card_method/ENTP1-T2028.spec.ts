import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { userAddressCreditCardMX } from '@support/interfaces/address_user';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
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

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.openPayFingerprintProcessor,
        merchantId,
        merchantToken
      );

      const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          identity_document: creditCardData.openpayVisaSuccessful.document_number,
          phone: userAddressCreditCardMX.phone,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
          addressData: userAddressCreditCardMX,
        }
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: email,
      });
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

    test.fixme(
      '@ENTP1-T2028 Payment Widget: Fingerprint OpenPay',
      {
        annotation: { type: 'bug', description: 'PF-3774' },
        tag: ['@installments', '@team_enterprise'],
      },
      async ({ page }) => {
        const paymentWidgetPage = new PaymentDeunaNowPage(page);

        await test.step('User logs in', async () => {
          await paymentWidgetPage.enterOTPCode();
        });

        await test.step('widget waits for key to be loaded', async () => {
          await paymentWidgetPage.assertOpenPayFraudKeyLoaded();
        });

        await test.step('The user fills credit card information', async () => {
          await paymentWidgetPage.fillCreditCardDataDeunaNow(creditCardData.openpayVisaSuccessful, {
            waitForInstallments: true,
            country: 'MX',
          });
        });

        await test.step('The user clicks on pay', async () => {
          await paymentWidgetPage.clickPay();
        });

        await test.step('order is processed successfully', async () => {
          await paymentWidgetPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });
      }
    );
  }
);
