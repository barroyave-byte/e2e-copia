import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PaymentWidgetFormPage } from '@pages/explore/forms/payment_widget/paymentWidgetFormPage';
import { verifyElementVisualConsistency } from '@visual/utils/visualTestingUtils';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModule[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'additional_description',
          validation: {
            required: true,
          },
        },
        {
          name: 'state_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: true,
    },
  },
];
const widgetGeneralsConfig = {
  checkout_modules,
};

test.describe(
  '@regression @visual Traducciones - Payment Widget - PT',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country: 'CO',
          checkout_modules: [],
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2377 Traducciones - Payment Widget - Sin OTP - pago con tarjeta - datos de facturacion en la vista principal - PT',
      { tag: ['@visual', '@admin_connection', '@admin-preprod', '@team_enterprise'] },
      async ({ page }) => {
        const paymentWidgetFormPage = new PaymentWidgetFormPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');

        // Since the point of the test is to generate visual regressions of the payment widget in PT language,
        // the admin does not need to be opened in PT language too.
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const ecommersePage = new EcommercePage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user & set up PT language', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');

          // The payment widget will be in PT language.
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            language: 'PT',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select Payment Widget Option', async () => {
          await paymentWidgetFormPage.selectPaymentWidgetForm();

          // Hide Explore footer
          await page.evaluate(() => {
            const element = document.getElementById('footer');
            if (element) {
              element.style.display = 'none';
            }
          });
        });

        await test.step('Enter as Guest', async () => {
          await ecommersePage.hideNavbar();
          await ecommersePage.ensurePaymentWidgetContainerVisible();
          await paymentDeunaNowPage.userGuest();
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await verifyElementVisualConsistency(
          paymentDeunaNowPage.page,
          'payment-widget-embed',
          [
            {
              label: 'mobile',
              width: 640,
              height: 1080,
            },
          ],
          'validate-payment-form-content',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );

        await test.step('Click on pay button without fill card form', async () => {
          await paymentDeunaNowPage.clickOnPayButtonWithoutWaitResponse();
        });

        await verifyElementVisualConsistency(
          paymentDeunaNowPage.page,
          'payment-widget-embed',
          [
            {
              label: 'mobile',
              width: 640,
              height: 1080,
            },
          ],
          'validate-payment-form-error-messages-visible',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );

        await test.step('Fill card form & click on pay button', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
        });
      }
    );
  }
);
