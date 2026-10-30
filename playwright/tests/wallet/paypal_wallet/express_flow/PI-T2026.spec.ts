import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');

test.describe(
  '@regression Cancel order by merchant with pending payment status',
  { tag: ['@payment_widget', '@team_enterprise'] },
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

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX');
      const response = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = response.data.token;
    });

    test('@PI-T2026 Cancel order by merchant with pending payment status', async ({
      page,
      emaService,
    }) => {
      const paymentPage = new PaymentPage(page);
      const paypalFormPage = new PayPalFormPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

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

      await test.step('Should click on Pay button', async () => {
        await paypalFormPage.clickOnPayButton();
      });

      await test.step('Should show PayPal redirect view', async () => {
        await paymentPage.assertPayPalRedirectSubtitle(
          checkoutTranslations.apmRedirectView.labelDoNotCloseWindow
        );
      });

      await test.step('Cancel order by merchant', async () => {
        await emaService.cancelOrder(orderToken, privateKey);
      });

      await test.step('Validate order payment status is cancelled', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('cancelled');
        await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.paypal);
        await adminOrderDetailsPage.assertPaymentMethod('wallet');
      });
    });
  }
);
