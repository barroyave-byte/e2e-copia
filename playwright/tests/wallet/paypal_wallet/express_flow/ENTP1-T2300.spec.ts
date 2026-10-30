import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { paypalAccount } from '../common';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let publicKey: string;
    let privateKey: string;

    test.beforeAll(async ({ merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYPAL_WALLET_CHECKOUT_MX');
      publicKey = merchant.publicKey;
      privateKey = merchant.privateKey;
    });

    test(
      '@ENTP1-T2300 Successful guest airline purchase without installments',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        let paypalPage: PayPalPage;
        const ecommercePage = new EcommercePage(page);
        const paypalFormPage = new PayPalFormPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const paymentPage = new PaymentPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.setUpExplore({
            orderToken: '',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          await ecommercePage.clickOnProductPayPal();
          await ecommercePage.addToCart();
          await ecommercePage.clickOnIconBasket();
          await testingTool.navigateToSelectOrderType();
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

        await test.step('Should login on PayPal', async () => {
          await paypalPage.loginCheckout(paypalAccount.email, paypalAccount.password);
        });

        await test.step('Should click on PayPal pay button', async () => {
          await paypalPage.clickOnPaymentButton();
        });

        await test.step('Should go to the order summary', async () => {
          await paymentLinkPage.assertThankyouPage(
            deunanowTranslations.screenThankYouPage.labelSuccessfulTitle
          );
        });
      }
    );
  }
);
