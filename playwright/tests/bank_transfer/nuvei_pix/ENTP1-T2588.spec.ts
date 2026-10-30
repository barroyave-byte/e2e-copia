import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { getTranslations } from '@support/translations/getTranslations';
import { VoucherTranslations } from '@support/translations/selectors/voucher/voucherTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { PixPage } from '@pages/checkout/pixPage';
import { PixVoucherPage } from '@pages/voucher/pixVoucherPage';
import { VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchantCheckout = new ConfigMerchantCheckout();

const voucherTranslation: VoucherTranslations = getTranslations('voucher', 'ES');

test.describe(
  '@regression Nuvei PIX - Payment Widget',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';

    let orderToken: string;
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('BR');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      merchantToken = merchant.merchantToken;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );
      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiPixProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('BR', { amount: 100000 });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2588 Nuvei PIX - Payment Widget: Successful purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const pixPage = new PixPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);
        const pixVoucherPage = new PixVoucherPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
        const installments = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on Nuvei PIX tab', async () => {
          await paymentPage.clickOnPixTab('nuvei_pix');
        });

        await test.step('Should validate Nuvei PIX disclaimer', async () => {
          await pixPage.assertPixDisclaimer();
        });

        await test.step('Should click on Pay button', async () => {
          await paymentPage.clickOnPay();
        });

        await test.step('Should validate Nuvei PIX voucher', async () => {
          await pixVoucherPage.assertPixVoucher();
        });

        await test.step('Should validate Nuvei PIX voucher countdown', async () => {
          await pixVoucherPage.assertPixVoucherCountdown();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.nuveiPix);
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
