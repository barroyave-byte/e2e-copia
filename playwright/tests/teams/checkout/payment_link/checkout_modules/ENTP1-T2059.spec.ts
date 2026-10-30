import { test } from '@deuna/test';
import { init, registerUser, setCreditCard, setElementsConfig, tokenizeOrder } from './common';
import * as creditCardData from '@support/interfaces/credit_cards';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
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
      await setElementsConfig(true, false);
      orderToken = await tokenizeOrder();
    });

    test(
      '@ENTP1-T2059 Purchase Exitoso: Payment Link con Checkout Modules (Usuario registrado - Sin OTP)',
      { tag: ['@installments', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
        const paymentPage = new PaymentPage(page);
        let paymentLinkPayment: PaymentPage;
        const installments: number = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const paymentLinkPopupPromise = page.waitForEvent('popup');
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            language: 'PT',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          const paymentLinkPopup = await paymentLinkPopupPromise;
          paymentLinkPayment = new PaymentPage(paymentLinkPopup, 'PT');
        });

        await test.step('Should be hidden subtotal', async () => {
          await paymentLinkPayment.assertHiddenSubtotal();
        });

        await test.step('Should be visible the T&C', async () => {
          await paymentLinkPayment.assertTermsAndConditions();
        });

        await test.step('Should enter the credit card info', async () => {
          await paymentLinkPayment.fillCreditCardDataWithBase(
            creditCardData.pagbankMasterCardSucessful
          );
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
