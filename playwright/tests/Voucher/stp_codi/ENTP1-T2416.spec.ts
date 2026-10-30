import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { userDataMX } from '@support/interfaces/user_data';
import { StpCodiFormPage } from '@pages/explore/forms/stpCodiFormPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression STP CoDi - Payment Widget (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stpCodiProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 1900 });

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test.fixme(
      '@ENTP1-T2416 Close widget with cancel button',
      {
        annotation: { type: 'bug', description: 'PF-3806' },
        tag: ['@smoke_gmv', '@team_enterprise'],
      },
      async ({ page }) => {
        const stpCodiFormPage = new StpCodiFormPage(page);
        const paymentPage = new PaymentPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should select STP CoDi form', async () => {
          await stpCodiFormPage.selectStpCodiForm();
        });

        await test.step('Should click on pay button', async () => {
          await stpCodiFormPage.clickOnPayButton();
        });

        await test.step('Should fill phone selector', async () => {
          const country = userDataMX.country;
          const STP_TEST_PHONE = '5559062217';
          await paymentPage.fillPhoneWithCountry(country, STP_TEST_PHONE);
        });

        await test.step('Should click on pay button', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should click on cancel button', async () => {
          await voucherProcessorsPage.clickOnCancelButton();
        });

        await test.step('Should assert voucher is hidden', async () => {
          await voucherProcessorsPage.assertVoucherIsHidden();
        });
      }
    );
  }
);
