import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentWidgetFormPage } from '@pages/explore/forms/payment_widget/paymentWidgetFormPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';
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
      show_in_main_view: false,
    },
  },
];
const widgetGeneralsConfig = {
  checkout_modules,
};
const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Payment Widget - onResize callback - embedded',
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
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
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
          checkout_modules: [],
          country: 'CO',
          address: '',
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: { ...MERCHANT_LOGO_WIDGETS_CONFIG, ...widgetGeneralsConfig } },
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
      '@ENTP1-T2327 El callback onResize es llamado cuando cambia el contenido del Payment Widget - widget embebido',
      { tag: ['@admin_connection', '@admin-preprod', '@team_enterprise'] },
      async ({ page }) => {
        const paymentWidgetFormPage = new PaymentWidgetFormPage(page);

        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select Payment Widget Option', async () => {
          await paymentWidgetFormPage.selectPaymentWidgetForm();
        });

        await test.step('Assert Payment Widget Container is visible', async () => {
          await paymentWidgetFormPage.assertPaymentWidgetContainerIsVisible();
        });

        await test.step('Assert OTP page is loaded and container is resized', async () => {
          await paymentWidgetFormPage.assertOtpPageIsLoadedAndContainerIsResized();
        });

        await test.step('Assert Payment Widget Container is resized after payment form is loaded', async () => {
          await paymentWidgetFormPage.assertPaymentWidgetContainerIsResizedAfterPaymentFormIsLoaded();
        });

        await test.step('Assert Billing Form is shown and container is resized', async () => {
          await paymentWidgetFormPage.assertContainerIsResizedWhenBillingFormIsShown();
        });

        await test.step('Assert Billing Form is saved and container is resized', async () => {
          await paymentWidgetFormPage.fillBillingForm();
          await paymentWidgetFormPage.assertContainerIsResizedWhenBillingFormIsSaved();
        });

        await test.step('Polling is shown and container is not resized', async () => {
          await paymentWidgetFormPage.fillCreditCardData(creditCardData.globalpayVisaFailed);
          await paymentWidgetFormPage.assertClickOnPayButtonPollingIsShownAndContainerIsNotResized();
        });
      }
    );
  }
);
