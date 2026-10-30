import { Page, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { FormsPage } from '@pages/explore/formsPage';
import { AstropayPage } from '@pages/explore/forms/astropayPage';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Astropay Offline AR',
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
      test.setTimeout(40000);
      const merchant = await configMerchant.basicSetup('AR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.astropayProcessorAR,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test.fixme(
      '@ENTP1-T2558 Astropay Offline AR',
      {
        annotation: { type: 'bug', description: 'PF-3774' },
        tag: ['@payments_integration', '@team_enterprise'],
      },
      async ({ page, paymentService, emaService }) => {
        const formsPage = new FormsPage(page);
        const mainPage = new AstropayPage(page);

        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

        let astropayPopup: Page;

        await test.step('Select Astropay as payment method and wait for the redirect popup', async () => {
          const popupPromise = page.waitForEvent('popup', { timeout: 60_000 });

          await formsPage.selectProcessorToOpenModal('astropay');
          await mainPage.assertLabelProcessingPaymentVisible();
          astropayPopup = await popupPromise;
        });

        await test.step('Verify Astropay checkout popup and confirm payment', async () => {
          const astropayPage = new AstropayPage(astropayPopup, 'EN');
          await astropayPage.clickOnAstropay();
        });

        await test.step('Simulate Astropay payment webhook with COMPLETED status', async () => {
          const order = await emaService.getOrder(privateKey, orderToken);

          const merchantPaymentProcessorId =
            order.data.order.payment.data.merchant_payment_processor_id;
          const externalTransactionId = order.data.order.payment.data.external_transaction_id;

          await paymentService.sendPaymentWebhook(merchantId, merchantPaymentProcessorId, {
            payment_external_id: externalTransactionId,
            payment_status: 'COMPLETED',
          });
        });

        await test.step('Verify that the order payment status is "processed" in the admin panel', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
