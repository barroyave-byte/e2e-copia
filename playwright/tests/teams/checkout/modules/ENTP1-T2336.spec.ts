import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';

const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
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
];

test.describe(
  '@regression Checkout - Billing Pattern - Events',
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
      const merchant = await merchantPool.acquire('AMEX_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          first_name: 'Pepe',
          last_name: 'Perez',
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
      '@ENTP1-T2336 Usuario con datos de billing - en form (Events)',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);

        await test.step('Check that billing events are triggered correctly with data preloaded', async () => {
          await paymentPage.assertEventWasFired('billingSet');
          await paymentPage.assertButtonPayVisible();
          await Promise.all([
            paymentPage.assertEventWasFired('billingChange'),
            paymentPage.showBillingFormIFrame(),
          ]);
        });

        await test.step('Check that form billing events are triggered correctly ', async () => {
          await Promise.all([
            paymentPage.assertEventWasFired('backTo'),
            paymentPage.clickBillingCancelButton(),
          ]);
          await paymentPage.showBillingFormIFrame();
          await Promise.all([
            paymentPage.assertEventWasFired('billingFormSave'),
            paymentPage.clickSaveButton(),
          ]);
        });
      }
    );
  }
);
