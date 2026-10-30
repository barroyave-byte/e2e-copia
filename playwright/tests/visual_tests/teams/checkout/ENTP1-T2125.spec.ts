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
      '@ENTP1-T2125 Credit card form - expiry date invalid month error message',
      {
        tag: ['@visual', '@payments_integration', '@team_enterprise', '@preprod', '@checkout_ui'],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('User enter 00/30 in the expiry date field and clicks on pay button', async () => {
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.stripeMastercardSuccessful,
              number: '4242424242424242',
              expiration_date: '0030',
            },
            { country: 'MX' }
          );
          await paymentDeunaNowPage.clickOnPayButtonWithoutWaitResponse();
        });

        await test.step('Invalid month message must be visible', async () => {
          await paymentDeunaNowPage.userSeesExpiryDateInvalidMonthErrorMessage();
        });

        await test.step('User verifies UI - invalid month error message visible', async () => {
          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopAndFullscreen,
            'verify-expiry-date-invalid-month-message'
          );
        });

        await test.step('User enter 01/30 in the expiry date field', async () => {
          await paymentDeunaNowPage.fillInputExpirationDate('0130');
        });

        await test.step('Error message must not be visible', async () => {
          await paymentDeunaNowPage.assertExpiryDateErrorMessageNotVisible();
        });

        await test.step('User enter 16/30 in the expiry date field', async () => {
          await paymentDeunaNowPage.fillInputExpirationDate('1630');
        });

        await test.step('Invalid month message must be visible', async () => {
          await paymentDeunaNowPage.userSeesExpiryDateInvalidMonthErrorMessage();
        });
      }
    );
  }
);
