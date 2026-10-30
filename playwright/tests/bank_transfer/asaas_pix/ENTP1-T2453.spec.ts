import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { PixPage } from '@pages/checkout/pixPage';
import { PixVoucherPage } from '@pages/voucher/pixVoucherPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Asaas PIX - Payment Widget',
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
      const merchant = await configMerchantCheckout.basicSetup('BR');
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
        processorsConfig.asaasPixProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('BR', { amount: 100000 });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2453 Asaas PIX - Payment Widget: Successful purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const pixPage = new PixPage(page);
        const pixVoucherPage = new PixVoucherPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
        const installments = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          await page.addInitScript(() => {
            (window as any).__printTriggered = false;
            window.print = () => {
              (window as any).__printTriggered = true;
            };
          });
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on Asaas PIX tab', async () => {
          await paymentPage.clickOnPixTab('asaas_pix');
        });

        await test.step('Should validate Asaas PIX disclaimer', async () => {
          await pixPage.assertPixDisclaimer();
        });

        await test.step('Should click on Pay button', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should validate Asaas PIX voucher', async () => {
          await pixVoucherPage.assertPixVoucher();
        });

        await test.step('Should validate Asaas PIX voucher countdown', async () => {
          await pixVoucherPage.assertPixVoucherCountdown();
        });

        await test.step('Should copy voucher reference', async () => {
          await pixVoucherPage.clickOnCopyReference();
          await pixVoucherPage.assertCopyCheckIcon();
        });

        await test.step('Should cancel voucher', async () => {
          await pixVoucherPage.clickOnCancel();
          await paymentPage.clickOnPixTab('asaas_pix');
          await pixPage.assertPixDisclaimer();
        });

        await test.step('Should return to the payment voucher', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should validate download voucher button', async () => {
          await pixVoucherPage.assertDownloadReferenceButton();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.asaasPix);
          await adminOrderDetailsPage.assertPaymentMethod('bank_transfer');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );

    test.afterAll(async ({ paymentService }) => {
      await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
    });
  }
);
