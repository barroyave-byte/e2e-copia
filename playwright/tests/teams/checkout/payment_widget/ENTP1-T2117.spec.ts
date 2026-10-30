import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModule[] = [
  {
    name: 'PriceBreakdownPattern',
    props: {
      show_in_main_view: false,
      fields: [],
    },
  },
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'address2',
          validation: {
            required: true,
          },
        },
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
  {
    name: 'BillingSummaryPattern',
    props: {
      fields: [
        {
          name: 'address1',
        },
        {
          name: 'city',
        },
        {
          name: 'state_name',
        },
      ],
    },
  },
];
const widgetGeneralsConfig = {
  checkout_modules,
};
const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression User Authenticated billing data incomplete and do not allowed purchase',
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

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: { ...MERCHANT_LOGO_WIDGETS_CONFIG, ...widgetGeneralsConfig } },
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
      '@ENTP1-T2117 User Authenticated billing data incomplete and do not allowed purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('User logs in', async () => {
          await paymentDeunaNowPage.enterOTPCode();
        });

        await test.step('Show Billing Form to click on save and display fields required and click on cancel', async () => {
          await paymentDeunaNowPage.assertBillingCheckboxIsVisible();
          await paymentDeunaNowPage.clickToSaveFormButton();
          await paymentDeunaNowPage.assertFieldsRequiredMessages();
          await paymentDeunaNowPage.clickOnCancelFormButton();
        });

        await test.step('The user inserts a credit card', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
        });

        await test.step('The user clicks pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user show alert missing billing data', async () => {
          await paymentDeunaNowPage.assertAlertMissingBillingData();
        });

        await test.step('It is validated that the order is pending', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertOrderStatus('pending');
        });
      }
    );
  }
);
