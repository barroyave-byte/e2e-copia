import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

test.describe(
  '@regression Payment Widget - back to merchant button - modal',
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
      const merchantConfig = await merchantPool.acquire('MX_STRIPE');
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      merchantName = merchantConfig.merchantName;
      privateKey = merchantConfig.privateKey;
      publicKey = merchantConfig.publicKey;

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
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
      '@ENTP1-T2120 Back to merchant button works close the modal - Payment Widget',
      {
        tag: ['@preprod', '@checkout_ui', '@payments_integration', '@team_payment_integration'],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('User clicks on back button', async () => {
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await paymentDeunaNowPage.clickBackToMerchantButton();
        });

        await test.step('Payment Widget modal must not visible', async () => {
          await paymentDeunaNowPage.assertPaymentWidgetModalNotVisible();
        });
      }
    );
  }
);
