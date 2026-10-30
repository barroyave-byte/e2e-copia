import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

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

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('CASH_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
        amount: 1750,
        checkout_modules: [
          {
            name: 'BillingPattern',
            props: {
              show_in_main_view: true,
              fields: [
                { name: 'country', field_type: 'Input', validation: { required: true } },
                { name: 'state_name', field_type: 'Input', validation: { required: true } },
                { name: 'city', field_type: 'Input', validation: { required: true } },
                { name: 'first_name', validation: { required: true } },
                { name: 'last_name', validation: { required: true } },
              ],
            },
          },
        ],
        redirect_urls: {
          close: 'https://www.deuna.com/?q=close',
          error: 'https://www.deuna.com/?q=error',
          fallback: 'https://www.deuna.com/?q=fallback',
          pending: 'https://www.deuna.com/?q=pending',
          success: 'https://www.deuna.com/?q=success',
        },
      });

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
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
      '@ENTP1-T2140 Checkout - Billing Pattern: Custom fields configuration',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertButtonPayVisible();
          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should fills text inputs ', async () => {
          await paymentPage.fillBillingFormWithCustomTypeFields({
            country: 'Mexico',
            state: 'SLP',
            department: 'SLP',
          });
        });

        await test.step('The user clicks on pay', async () => {
          await paymentPage.clickOnPay(undefined, false, false);
        });
      }
    );
  }
);
