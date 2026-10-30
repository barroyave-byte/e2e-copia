import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

test.describe(
  '@regression @visual Payment Widget - identification number field - modal',
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
      '@ENTP1-T2145 CardForm - Does not allow form submission if the identification number field contains only blank spaces',
      {
        tag: ['@visual', '@payments_integration', '@team_enterprise', '@preprod', '@checkout_ui'],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

        await test.step('User left empty the identification number field and clicks on pay button', async () => {
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow({
            ...creditCardData.stripeMastercardSuccessful,
            number: '4242424242424242',
            document_number: '          ',
          });
          await paymentDeunaNowPage.clickOnPayButtonWithoutWaitResponse();
        });

        await test.step('Document number error message must be visible', async () => {
          await paymentDeunaNowPage.userSeeDocumentNumberError();
        });

        await verifyVisualConsistency(
          paymentDeunaNowPage.page,
          commonViewportSets.desktopAndFullscreen,
          'verify-invalid-document-number-message'
        );

        await test.step('The user completes the identification number field with a valid value and a blank space at the end', async () => {
          await paymentDeunaNowPage.clearInputsCreditCard('documentNumber');
          await paymentDeunaNowPage.fillInputDocumentNumber(IDENTITY_DOCUMENTS.MX.RFC);
        });

        await test.step('User clicks on pay button', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed', 5, 2000);
        });
      }
    );
  }
);
