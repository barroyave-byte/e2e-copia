import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';
import * as userData from '@support/interfaces/user_data';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const globalAssert = new GlobalAssert();

const email = EmailGenerator.generateRegisteredUserEmail();

declare const window: Window & { disablePolling: any };

const checkout_modules = [
  {
    name: 'LoginPattern',
  },
  { name: 'UserInfoPattern' },
  {
    name: 'OrderDetailPattern',
    props: {
      hide_product_image: true,
    },
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'zipcode',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
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
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
        checkout_modules: checkout_modules,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await page.addInitScript(() => {
          window.disablePolling = true;
        });
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2013 compra TC/TD - Usuario Nuevo',
      {
        tag: ['@review_action', '@preprod', '@checkout_ui', '@team_enterprise'],
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
        const paymentPage = new PaymentPage(paymentLinkPage);
        const guestUserPage = new GuestUserDataPage(paymentLinkPage);

        await test.step('The user inputs email that doesnt exist', async () => {
          await validateEmailPage.enterEmail(email);
          await validateEmailPage.clickOnContinue();
        });

        await test.step('The user fills user information', async () => {
          await guestUserPage.enterGuestUserData(userData.userDataMX);
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull, {
            country: 'MX',
          });
        });

        await test.step('The user inputs zipcode', async () => {
          await paymentPage.enterBillingZipCode();
        });

        await test.step('user sees terms and conditions', async () => {
          await paymentPage.assertUserSeeTermsAndConditions();
        });

        await test.step('The user clicks on purchase', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200);
          await paymentPage.assertCardsCreationIsCalled(true);
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
