import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYPAL_WALLET_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 7980000 });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test('@ENTP1-T2086 Cancel guest purchase', { tag: ['@team_enterprise'] }, async ({ page }) => {
      let paypalPage: PayPalPage;
      const paymentPage = new PaymentPage(page);
      const paypalFormPage = new PayPalFormPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = 1;

      await test.step('Should opens the testing page and navigate to the required experience', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Should selects PayPal as a Payement Method', async () => {
        await paypalFormPage.selectPayPalExpressForm();
      });

      // Listen before clicking: the popup can open while clickOnPayButton is still waiting.
      const paypalPopupPromise = page.waitForEvent('popup');

      await test.step('Should click on Pay button', async () => {
        await paypalFormPage.clickOnPayButton();
      });

      await test.step('Should show PayPal redirect view', async () => {
        const paypalPopup = await paypalPopupPromise;
        paypalPage = new PayPalPage(paypalPopup);
        await paymentPage.assertPayPalRedirectSubtitle(
          checkoutTranslations.apmRedirectView.labelDoNotCloseWindow
        );
      });

      await test.step('Should click on Return to Store button', async () => {
        await paypalPage.clickOnReturnToStoreButton();
      });

      await test.step('Should show payment redirect view', async () => {
        await paypalPage.assertRedirectPage(
          deunanowTranslations.screenRedirectToCommerceView.labelOrderCancelled
        );
      });

      await test.step('Should validates that the order detail is correct', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied');
        await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.paypal);
        await adminOrderDetailsPage.assertPaymentMethod('wallet');
        await adminOrderDetailsPage.assertNumberOfInstallments(installments);
      });
    });
  }
);
