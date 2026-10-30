import { Page, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AddiReferencePayModalPage } from '@pages/explore/forms/addi/addiReferencePayModalPage';
import { AddiFormPage } from '@pages/explore/forms/addi/addiFormPage';
import { AddiRedirectPage } from '@pages/bnpl/addiPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

const widgetGeneralsConfig = {
  user_experience: {
    render_3ds_strategy: 'iframe',
  },
};

const withPopupHealthCheck = <T>(popup: Page, action: () => Promise<T>): Promise<T> => {
  if (popup.isClosed()) {
    throw new Error('Addi popup closed unexpectedly before action could complete');
  }

  return action();
};

test.describe('@regression Addi purchase succeeded with render_3ds_strategy as redirect', () => {
  let addiPopup: Page | undefined;
  test.afterEach(async () => {
    if (addiPopup && !addiPopup.isClosed()) {
      await addiPopup.close().catch(() => {});
    }
  });

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
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.addiProcessor,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, { amount: 7980000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createConfigurationV2({ widgetGeneralsConfig }, merchantId, merchantToken);
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
    '@ENTP1-T2101 Addi - Debit PSE: purchase exitoso con render_3ds_strategy',
    { tag: ['@payment_widget', '@team_enterprise'] },
    async ({ page }) => {
      test.setTimeout(6 * 60 * 1000); // 6 minutes for external service fow

      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const addiReferencePayModalPage = new AddiReferencePayModalPage(page);
      const paymentPage = new AddiFormPage(page);
      let addiRedirectPage: AddiRedirectPage;

      await test.step('Should selects Addi as a Payement Method', async () => {
        await paymentPage.selectAddiForm();
      });

      await test.step('Should click on the Pay button to open the payment widget in a modal', async () => {
        const addiRedirectPagePromise = page.waitForEvent('popup', { timeout: 60_000 });
        await paymentPage.clickPay();
        await addiReferencePayModalPage.fillFormData();
        await addiReferencePayModalPage.clickOnPay();
        const popup = await addiRedirectPagePromise;
        addiPopup = popup;

        // Wait for popup to be ready before interacting
        await popup.waitForLoadState('domcontentloaded');

        addiRedirectPage = new AddiRedirectPage(popup);
        await addiRedirectPage.assertAddiPage();
      });

      await test.step('The user select debit with PSE - Addi page', async () => {
        await withPopupHealthCheck(addiPopup!, () => addiRedirectPage.selectDebitWithPSE());
      });

      await test.step('PSE payment form must be visible', async () => {
        await addiRedirectPage.assertPaymentFormMustBeVisible();
      });

      await test.step('Fill the payment form and click on pay button', async () => {
        await addiRedirectPage.selectApproveBank();
        await addiRedirectPage.fillUserData();
        await addiRedirectPage.sendPayment();
        await addiRedirectPage.waitForClose();
      });

      await test.step('The thank you page should be displayed on the merchant', async () => {
        await paymentPage.assertThankyouPage('Pago completado');
      });

      await test.step('Should validate that the order details are correct', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertPaymentMethod('bnpl');
      });
    }
  );
});
