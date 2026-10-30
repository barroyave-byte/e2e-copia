import { test } from '@support/fixtures';
import { aplazoProcessor } from '@support/interfaces/payment_processors';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Aplazo form Purchase - MX with Challenge popup blocked',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
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
      await apiCallNewman.createPaymentProcessor(aplazoProcessor, merchantId, merchantToken);

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 10000 });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test.fixme(
      '@ENTP1-T2081 Aplazo: Purchase Successful with challenge blocked automatically',
      {
        annotation: { type: 'bug', description: 'ENTP1-13916' },
        tag: ['@smoke', '@team_enterprise'],
      },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new AplazoFormPage(page);
        let aplazoRedirectPage: AplazoRedirectPage;

        await page.addInitScript(() => {
          window.open = () => null;
        });

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Aplazo as a Payement Method', async () => {
          await paymentPage.selectAplazoForm();
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          await paymentPage.clickPay();
          await paymentPage.clickGoToSiteButton();
          const aplazoRedirectPagePopup = await page.waitForEvent('popup', { timeout: 10000 });
          console.log('POPUP => ', aplazoRedirectPagePopup);
          aplazoRedirectPage = new AplazoRedirectPage(aplazoRedirectPagePopup);
        });

        await test.step('Should login in Aplazo page', async () => {
          await aplazoRedirectPage.sendPhonenumber();
          await aplazoRedirectPage.verifyOTP();
        });

        await test.step('You should click on the Buy button to make the payment', async () => {
          await aplazoRedirectPage.clickOnButtonBuy();
          // await aplazoRedirectPage.assertProcessingOrder(); - TODO - review this assertion with cristian
        });

        await test.step('order is processed successfully', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed', 5, 6000);
        });
      }
    );
  }
);
