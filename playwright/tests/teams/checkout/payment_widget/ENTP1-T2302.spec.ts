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
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
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

test.describe(
  '@regression @visual PaymentWidget: Handle error messages before purchase',
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
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: email,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.setCreditCardForUser(
        email,
        creditCardData.globalpayVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: { ...MERCHANT_LOGO_WIDGETS_CONFIG, ...widgetGeneralsConfig } },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2302 PaymentWidget: Handle error messages before purchase',
      { tag: ['@visual', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('User login', async () => {
          await paymentDeunaNowPage.enterOTPCode();
        });

        await test.step('Show Billing Form to fill data', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await page.waitForTimeout(1000);
          await paymentDeunaNowPage.fillBillingForm();
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('User click on pay and see alert', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
          await paymentDeunaNowPage.scrollToElement(paymentDeunaNowPage.iconCloseAlert);

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-1-verify-alert'
          );

          await paymentDeunaNowPage.closeAlert();
        });

        await test.step('User clicks on the new card', async () => {
          await paymentDeunaNowPage.selectOptionAddNewCreditCard();
        });

        await test.step('User click on pay and see errors message in card form', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step-2-verify-errors-message-in-card-form'
          );
        });

        await test.step('User inserts a credit card', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.globalpayVisaSuccessful,
            { country: 'CO' }
          );
        });

        await test.step('User clicks pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
