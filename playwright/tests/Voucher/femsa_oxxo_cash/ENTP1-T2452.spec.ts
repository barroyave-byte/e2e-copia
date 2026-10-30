import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { FemsaOxxoCashPage } from '@pages/checkout/femsaOxxoCashPage';
import { FemsaOxxoCashVoucherPage } from '@pages/voucher/femsaOxxoVoucherPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Femsa Oxxo - Payment Widget',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';

    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );
      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.femsaOxxoCashProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 100000 });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test.fixme(
      '@ENTP1-T2452 Successful purchase with pending voucher',
      { annotation: { type: 'bug', description: 'PF-3806' }, tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const femsaOxxoCashPage = new FemsaOxxoCashPage(page);
        const femsaOxxoCashVoucherPage = new FemsaOxxoCashVoucherPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on Femsa Oxxo tab', async () => {
          await paymentPage.clickOnFemsaOxxoTab();
        });

        await test.step('Should validate Femsa Oxxo disclaimer', async () => {
          await femsaOxxoCashPage.assertFemsaOxxoDisclaimer();
        });

        await test.step('Should click on Pay button', async () => {
          await paymentPage.clickOnPayButton();
        });

        await test.step('Should validate Femsa Oxxo voucher', async () => {
          await femsaOxxoCashVoucherPage.assertFemsaOxxoCashVoucher();
        });

        await test.step('Should validate Femsa Oxxo voucher due date', async () => {
          await femsaOxxoCashVoucherPage.assertFemsaOxxoCashVoucherDueDate();
        });

        await test.step('Should validate Femsa Oxxo voucher additional info', async () => {
          await femsaOxxoCashVoucherPage.assertFemsaOxxoCashVoucherAdditionalInfo();
        });

        await test.step('Should validate Femsa Oxxo voucher order summary', async () => {
          await femsaOxxoCashVoucherPage.assertFemsaOxxoCashVoucherOrderSummary();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.validateProcessorVisibility('femsa oxxo cash', true);
          await adminOrderDetailsPage.assertPaymentMethod('voucher');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );

    test.afterAll(async ({ paymentService }) => {
      await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
    });
  }
);
