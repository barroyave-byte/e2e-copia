import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { PixPage } from '@pages/checkout/pixPage';
import { PixVoucherPage } from '@pages/voucher/pixVoucherPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchantCheckout = new ConfigMerchantCheckout();

const VOUCHER_EXPIRATION_SECONDS = 10;
const VOUCHER_EXPIRATION_TIMEOUT_MS = (VOUCHER_EXPIRATION_SECONDS + 5) * 1000;

test.describe(
  '@regression Asaas PIX - Payment Widget',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

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
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2454 Asaas PIX - Payment Widget: Expired purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const pixPage = new PixPage(page);
        const pixVoucherPage = new PixVoucherPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
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
          await paymentPage.clickOnPay(async () => {
            await pixVoucherPage.mockVoucherExpiration(VOUCHER_EXPIRATION_SECONDS);
          });
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should validate Asaas PIX voucher', async () => {
          await pixVoucherPage.assertPixVoucher();
        });

        await test.step('Should validate Asaas PIX voucher countdown', async () => {
          await pixVoucherPage.assertPixVoucherCountdown();
        });

        await test.step('Should return to payment methods upon voucher expiration', async () => {
          await pixVoucherPage.assertPixVoucherHidden(VOUCHER_EXPIRATION_TIMEOUT_MS);
          await pixVoucherPage.assertPixVoucherCountdownHidden();
          await pixPage.assertPixDisclaimer();
        });
      }
    );

    test.afterAll(async ({ paymentService }) => {
      await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
    });
  }
);
