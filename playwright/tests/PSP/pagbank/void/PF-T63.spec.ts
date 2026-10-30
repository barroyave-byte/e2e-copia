import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as pagbankPayload from '@support/interfaces/orders';

test.describe('@regression feature to validate Successful Void Pagbank with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    // create merchant for a country
    const merchant = await merchantPool.acquire('PAGBANK_AUTHORIZE_PROCESSOR_BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey; // MX, CO, PE, CL or other
    publicKey = merchant.publicKey;
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      pagbankPayload.orderCompletePayload() as any
    );
    orderToken = tokenized.data.token;

    // create payment processor
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      // Open the testing page and navigate to the widget to be tested
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PF-T63 Successful Void Pagbank test',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('User enters credit card information', async () => {
        // Fill credit card data in payment widget
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.pagbankVisaSuccessfulProcessing,
          { country: 'BR' }
        );
      });

      await test.step('User select Pay', async () => {
        // Click pay button
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        // Validate that the request /purchase sent from the UI is correct.
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);

        // Validate that when doing a get order, the status is correct.
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await adminOrderDetailsPage.voidOrder();
        await adminOrderDetailsPage.assertPaymentStatus('voided');
      });
    }
  );
});
