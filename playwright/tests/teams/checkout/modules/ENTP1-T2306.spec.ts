import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
        {
          name: 'country',
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
        {
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: false,
          },
        },
        {
          name: 'address1',
          validation: {
            required: false,
          },
        },
        {
          name: 'address2',
          validation: {
            required: false,
          },
        },
      ],
    },
  },
];

test.describe(
  '@regression Checkout - Billing Pattern',
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
      const email = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
        phone: '+5930987654321',
        checkout_modules: checkout_modules,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorAuthorize,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2306 Checkout - Billing Pattern: Validate Sequentially Disable / Enable Dropdowns ',
      {
        tag: [
          '@admin_connection',
          '@admin-preprod',
          '@preprod',
          '@checkout_ui',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page To configure a merchant and its connections', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        });

        await test.step('The user goes the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertButtonPayVisible();
          await paymentPage.showBillingForm();
        });

        await test.step('Should fill the fields with test data', async () => {
          await paymentPage.fillNameAndAddress({
            firstName: 'Juan',
            lastName: 'Zapata',
            address: 'Calle Falsa 123',
          });
        });

        await test.step('Fill the state and city and assert the state dropdown is enabled', async () => {
          await paymentPage.fillCountryBillingFormSequentially();
          await paymentPage.assertCityDropdownIsEnabled();
        });

        await test.step('Change country to reset the dropdowns', async () => {
          await paymentPage.changeCountry('CO');
        });

        await test.step('Check that the city dropdown is disabled', async () => {
          await paymentPage.assertCityDropdownIsDisabled();
        });
      }
    );
  }
);
