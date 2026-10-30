import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import * as creditCardData from '@support/interfaces/credit_cards';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [
      {
        name: 'BillingPattern',
        props: {
          show_in_main_view: true,
          fields: [
            {
              name: 'country',
              validation: {
                required: false,
              },
            },
            {
              name: 'state_name',
              validation: {
                required: false,
              },
            },
            {
              name: 'city',
              validation: {
                required: false,
              },
            },
            {
              name: 'first_name',
              validation: {
                required: true,
              },
            },
            {
              name: 'last_name',
              validation: {
                required: true,
              },
            },
          ],
        },
      },
    ],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression PaymentWidget: Assert missing fields events are firing correctly',
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
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        billing_first_name: '',
        billing_last_name: '',
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2418 Assert missing fields events are firing correctly',
      {
        tag: [
          '@preprod',
          '@checkout_ui',
          '@admin_connection',
          '@admin-preprod',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken,
            merchantCredentials: { publicKey, privateKey },
          });
        });

        await test.step('The user tries to pay without filling card inputs and the event fires containing the missing fields', async () => {
          await paymentDeunaNowPage.iframeZoid.waitFor({ state: 'visible', timeout: 60000 });
          await paymentDeunaNowPage.buttonBillingSummary.waitFor({
            state: 'visible',
            timeout: 60000,
          });

          const missingBillingEvent = paymentDeunaNowPage.assertMissingBillingModuleEventWasFired();

          const cardInfoEvent1 = paymentDeunaNowPage.assertMissingCardInfoEventWasFired({
            present: [
              'card_holder',
              'card_holder_dni',
              'card_number',
              'cvv',
              'expiry_month',
              'expiry_year',
            ],
          });
          await paymentDeunaNowPage.clickOnPayButton(false);
          await cardInfoEvent1;

          await missingBillingEvent;
        });

        await test.step('The user fills some inputs and the event fires without containing those fields', async () => {
          await paymentDeunaNowPage.fillInputCreditCardNumber(
            creditCardData.kushkiVisaSuccessfull.number
          );
          await paymentDeunaNowPage.fillInputExpirationDate(
            creditCardData.kushkiVisaSuccessfull.expiration_date
          );

          const cardInfoEvent2 = paymentDeunaNowPage.assertMissingCardInfoEventWasFired({
            present: ['card_holder', 'card_holder_dni', 'cvv'],
            absent: ['card_number', 'expiry_month', 'expiry_year'],
          });
          await paymentDeunaNowPage.clickOnPayButton(false);
          await cardInfoEvent2;
        });

        await test.step('The user fills card info, but not the billing info so the missingBillingModule still fires.', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.kushkiVisaSuccessfull, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
          const missingBillingEvent = paymentDeunaNowPage.assertMissingBillingModuleEventWasFired();
          await paymentDeunaNowPage.clickOnPayButton(false);
          await missingBillingEvent;
        });

        await test.step('The user opens the billing form, saves and the event fires containing the missing required fields', async () => {
          await paymentDeunaNowPage.assertBillingCheckboxIsVisible();
          const billingInfoEvent = paymentDeunaNowPage.assertMissingBillingInfoEventWasFired([
            'first_name',
            'last_name',
          ]);
          await paymentDeunaNowPage.clickToSaveFormButton();
          await billingInfoEvent;
        });
      }
    );
  }
);
