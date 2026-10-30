import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

test.describe(
  '@regression @visual Payment Widget - expiry date field - modal',
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
      const merchant = await merchantPool.acquire('MX_STRIPE');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
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
      '@ENTP1-T2126 Credit card form - expiry date expired card error message',
      {
        tag: ['@visual', '@payments_integration', '@team_enterprise', '@preprod', '@checkout_ui'],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('User enter an expired date and clicks on pay button', async () => {
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.stripeMastercardSuccessful,
              number: '4242424242424242',
              expiration_date: '0124',
            },
            { country: 'MX' }
          );
          await paymentDeunaNowPage.clickOnPayButtonWithoutWaitResponse();
        });

        await test.step('Invalid month message must be visible', async () => {
          await paymentDeunaNowPage.userSeesExpiryDateExpiredCardMessage();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'verify-expiry-date-invalid-month-message'
          );
        });
      }
    );
  }
);
