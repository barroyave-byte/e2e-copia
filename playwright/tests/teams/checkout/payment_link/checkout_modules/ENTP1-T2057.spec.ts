import { test } from '@deuna/test';
import { init, registerUser, setCreditCard, setElementsConfig, tokenizeOrder } from './common';
import * as creditCardData from '@support/interfaces/credit_cards';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';

test.describe(
  '@regression PagBank Payment Link Purchase - BR',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let orderToken: string;
    let publicKey: string;
    let privateKey: string;

    test.beforeAll(async () => {
      ({ merchantId, publicKey, privateKey } = await init());
      await registerUser();
      await setCreditCard();
      await setElementsConfig(false, true);
      orderToken = await tokenizeOrder();
    });

    test(
      '@ENTP1-T2057 Purchase Exitoso: Payment Link con Checkout Modules (Usuario autenticado - Con OTP)',
      { tag: ['@installments', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
        const paymentPage = new PaymentPage(page);
        let paymentLinkLoginPage: LoginPage;
        let paymentLinkPayment: PaymentPage;
        const installments: number = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const paymentLinkPopupPromise = page.waitForEvent('popup');
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          const paymentLinkPopup = await paymentLinkPopupPromise;
          paymentLinkLoginPage = new LoginPage(paymentLinkPopup);
          paymentLinkPayment = new PaymentPage(paymentLinkPopup, 'PT');
        });

        await test.step('Should user log in', async () => {
          await paymentLinkLoginPage.enterOtpCode();
        });

        await test.step('Should be hidden subtotal', async () => {
          await paymentLinkPayment.assertHiddenSubtotal();
        });

        await test.step('Should be hidden the T&C', async () => {
          await paymentLinkPayment.assertHiddenTermsAndConditions();
        });

        await test.step('Should enter the CVV code from registered credit card', async () => {
          await paymentLinkPayment.fillCvvCode(creditCardData.pagbankMasterCardSucessful.cvv_code);
        });

        await test.step('Should click on pay', async () => {
          await paymentLinkPayment.clickOnPay();
          await paymentLinkPayment.assertOrderStatusRequestPurchase('processed', 200);
        });

        await test.step('The Thank You page should be displayed on the merchant', async () => {
          await paymentPage.assertThankyouPage('Pago completado');
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.pagbank);
          await adminOrderDetailsPage.assertPaymentMethod('credit_card');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
