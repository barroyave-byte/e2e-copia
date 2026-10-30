import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { KlapFormPage } from '@pages/explore/forms/klapFormPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Klap Edenred Mostrar vista de error',
  { tag: ['@checkout', '@checkout_base', '@payment_widget', '@team_payment_integration'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('CL');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.klapEdenredProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey, {
        user_email: email,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
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

    test(
      '@ENTP1-T2061 Klap Edenred: Vista de error',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
      },
      async ({ page }) => {
        const formsPage = new FormsPage(page);
        const klapPage = new KlapFormPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('Select Klap Sodexo and assert some', async () => {
          await formsPage.selectProcessorToOpenModal('klapEdenred');
          await klapPage.assertIframeClosed();
        });

        await test.step('order is pending', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertOrderStatus('pending');
        });
      }
    );
  }
);
