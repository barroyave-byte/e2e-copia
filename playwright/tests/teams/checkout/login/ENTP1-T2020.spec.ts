import { test } from '@support/fixtures';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';
import * as userData from '@support/interfaces/user_data';
import { defaultCheckoutModules } from '@support/utils/checkoutModules';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

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

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBodyFromCommerce({
          country: 'MX',
          user_email: email,
          order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createCheckoutModulesConfig(
        defaultCheckoutModules,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey, privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2020 compra TC/TD - Usuario Nuevo Email From Commerce',
      {
        tag: ['@review_action', '@preprod', '@checkout_ui', '@team_enterprise'],
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 20000 });
        const paymentPage = new PaymentPage(paymentLinkPage);
        const guestUserPage = new GuestUserDataPage(paymentLinkPage);

        await test.step('The user fills user information', async () => {
          await guestUserPage.enterGuestUserDataWithDelay(userData.userDataMX);
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull, {
            country: 'MX',
          });
        });

        await test.step('The user inputs zip code', async () => {
          await paymentPage.enterBillingZipCode();
        });

        await test.step('user sees terms and conditions', async () => {
          await paymentPage.assertUserSeeTermsAndConditions();
        });

        await test.step('The user clicks on purchase', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200);
          await paymentPage.assertCardsCreationIsCalled(true);
        });
      }
    );
  }
);
