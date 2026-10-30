import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const email = EmailGenerator.generateRegisteredUserEmail();
const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'email',
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

    test(
      '@ENTP1-T2344 Usuario con datos de billing - en main view (Events)',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('Should trigger set event and not the started event', async () => {
          await Promise.all([
            paymentPage.assertEventWasNotFired('billingStarted'),
            paymentPage.assertEventWasFired('billingSet'),
          ]);

          await paymentPage.assertButtonPayVisible();
        });
      }
    );
  }
);
