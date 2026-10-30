import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { ReferencePayModalPage } from '@pages/explore/forms/oxxo/referecePayModalPage';
import { PayuEfectyPage } from '@pages/voucher/payuEfectyPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression PayU Efecty CO - Payment Widget: Validation of the voucher date',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // The voucher expiration is rendered by the widget in the browser's timezone,
    // while the PayU Efecty website renders it in Colombia's server time. Pin the
    // browser context to America/Bogota so both match on CI runners (UTC) exactly
    // as they do locally in Colombia. See ENTP1-T2169 timezone divergence.
    test.use({ timezoneId: 'America/Bogota' });

    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYU_EFECTY_PROCESSOR_CHECKOUT_CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const orderBody = DeunacheckoutOrderBuilder.createBody('CO', { amount: 7980000 });

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2169 PayU Efecty CO - Payment Widget: Validate that the voucher date in the widget and website is the same',
      { tag: ['@smoke_gmv', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const referencePayModalPage = new ReferencePayModalPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on the Pay button to purchase', async () => {
          await paymentPage.clickOnPay(null, true);
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should validate that the voucher date in the widget and on the website are the same', async () => {
          const widgetVoucherExpirationDate = await referencePayModalPage.getDeadlineDateIso();

          const payuEfectyPopupPromise = page.waitForEvent('popup');
          await referencePayModalPage.goToPaymentDetails();
          const payuEfectyPopup = await payuEfectyPopupPromise;
          const payuEfectyPage = new PayuEfectyPage(payuEfectyPopup);

          const webVoucherExpirationDate = await payuEfectyPage.getExpirationDateIso();

          expect(widgetVoucherExpirationDate).toStrictEqual(webVoucherExpirationDate);
        });
      }
    );
  }
);
