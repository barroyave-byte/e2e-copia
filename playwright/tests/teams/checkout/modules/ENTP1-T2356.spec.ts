import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const email = EmailGenerator.generateRegisteredUserEmail();
const visualization_conditional_tree = {
  condition: 'OR',
  rules: [
    {
      field: 'payment.selectedPaymentMethod.method_type',
      operator: '===',
      value: 'cash',
    },
  ],
};
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
          name: 'zipcode',
          validation: {
            required: false,
          },
        },
        {
          name: 'phone',
          validation: {
            required: true,
          },
        },
        {
          name: 'first_name',
          validation: {
            required: false,
          },
          label: {
            es: 'Primer nombre (opcional)',
            en: 'First name (optional)',
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'email',
          validation: {
            required: true,
          },
        },
        {
          name: 'additional_description',
        },
        {
          name: 'identity_document',
        },
      ],
      visualization_conditional_tree,
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

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('CASH_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          phone: '+524442421245',
          currency: 'MXN',
          country_code: 'MX',
          checkout_modules,
        })
      );
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

    test(
      '@ENTP1-T2356 lógica de patterns en APMs for Billing',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);

        await test.step('Should clicks on Add Billing Address, return to main view and go to Billing address again', async () => {
          await paymentPage.assertButtonPayVisible();
          await Promise.all([
            paymentPage.assertEventWasFired('billingStarted'),
            paymentPage.showBillingFormIFrame(),
          ]);
          await Promise.all([
            paymentPage.assertEventWasFired('backTo'),
            paymentPage.clickBillingCancelButton(),
          ]);
        });

        await test.step('Should fill the fields correctly and save', async () => {
          await paymentPage.showBillingFormIFrame();
          await paymentPage.fillCountryBillingForm();
          await Promise.all([
            paymentPage.assertEventWasFired('billingFormSave'),
            paymentPage.fillAddressAndZipcode({ address: 'Calle 123', zipCode: '12345' }),
          ]);
        });
      }
    );
  }
);
