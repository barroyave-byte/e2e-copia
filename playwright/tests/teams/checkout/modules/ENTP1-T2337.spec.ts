import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';

const configMerchantCheckout = new ConfigMerchantCheckout();

const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: true,
      fields: [
        {
          name: 'address1',
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

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('BR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.worldpayProcessorAuthorize_BR,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
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
          language: 'PT',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2337 Usuario sin datos de billing, en vista principal (Events)',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page, 'PT');

        await test.step('Check that billing events are triggered correctly without preloaded data', async () => {
          await Promise.all([
            paymentPage.assertEventWasFired('billingStarted'),
            paymentPage.assertEventWasNotFired('billingSet'),
          ]);
          await paymentPage.assertBillingTitleExist();
          await paymentPage.assertButtonPayVisible();
        });
      }
    );
  }
);
