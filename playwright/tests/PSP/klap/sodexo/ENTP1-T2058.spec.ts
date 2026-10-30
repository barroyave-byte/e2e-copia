import { test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { KlapSodexoPage } from '@pages/checkout/klap/klapSodexoPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Klap Sodexo Pago exitoso',
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
        processorsConfig.klapSodexoProcessor,
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
      '@ENTP1-T2058 Klap Sodexo: Pago exitoso',
      { tag: ['@payments_integration', '@team_payment_integration'] },
      async ({ page }) => {
        const formsPage = new FormsPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('Select Klap Sodexo and assert some', async () => {
          await formsPage.selectProcessorToOpenModal('klapSodexo');
        });

        await test.step('URL Klap Sodexo success data to process order', async () => {
          const klapSodexoPopup = await page.waitForEvent('popup');
          const klapSodexoPage = new KlapSodexoPage(await klapSodexoPopup);
          await klapSodexoPage.selectCardTypeOption();
          await klapSodexoPage.fillInputPassword();
          await klapSodexoPage.clickOnPay();
          await klapSodexoPage.clickOnRedirectToCommerce();
        });

        await test.step('order is processed successfully', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed', 5);
        });
      }
    );
  }
);
