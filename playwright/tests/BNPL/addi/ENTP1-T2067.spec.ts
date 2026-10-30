import { test } from '@support/fixtures';
import { addiProcessor } from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AddiFormPage } from '@pages/explore/forms/addi/addiFormPage';
import { AddiRedirectPage } from '@pages/bnpl/addiPage';
import { AddiReferencePayModalPage } from '@pages/explore/forms/addi/addiReferencePayModalPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';

test.describe(
  '@regression Addi Form Purchase - CO',
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
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(addiProcessor, merchantId, merchantToken);
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        amount: 7980000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2067 Payment Form - Addi: Purchase Error (Addi Window)',
      { tag: ['@payments_integration', '@smoke_gmv', '@smoke', '@team_enterprise'] },
      async ({ page }) => {
        const addiReferencePayModalPage = new AddiReferencePayModalPage(page);
        const paymentPage = new AddiFormPage(page);
        let addiRedirectPage: AddiRedirectPage;

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Addi as a Payement Method', async () => {
          await paymentPage.selectAddiForm();
        });

        await test.step('Should click on the Pay button to open the payment widget in a modal', async () => {
          const addiRedirectPagePromise = page.waitForEvent('popup');
          await paymentPage.clickPay();
          await addiReferencePayModalPage.fillFormData();
          await addiReferencePayModalPage.clickOnPay();
          const popup = await addiRedirectPagePromise;
          addiRedirectPage = new AddiRedirectPage(popup);
          await addiRedirectPage.assertAddiPage();
        });

        await test.step('The user select debit with PSE - Addi page', async () => {
          await addiRedirectPage.selectDebitWithPSE();
        });

        await test.step('PSE payment form must be visible', async () => {
          await addiRedirectPage.assertPaymentFormMustBeVisible();
        });

        await test.step('Fill the payment form and click on pay button', async () => {
          await addiRedirectPage.selectErrorBank();
          await addiRedirectPage.fillUserData();
          await addiRedirectPage.sendPayment();
          await addiRedirectPage.waitForClose();
        });

        await test.step('The user validates that the "Cancelar" button works to close the modal', async () => {
          await addiReferencePayModalPage.cancelPurchase();
        });
      }
    );
  }
);
