import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';

const configMerchant = new ConfigMerchant();
const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

test.describe('@regression DEUNA 3DS + MercadoPago - Purchase denegado con challenge', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorWithDEUNAThreeDS,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const ecommercePage = new EcommercePage(page);

      const testingTool = nagivateAndConfigureWidget(page, 'Checkout en Pasos');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });

      await ecommercePage.fillUserEmail(userEmail);
      await ecommercePage.clickOnCheckoutByStepsContinueButton();
      await ecommercePage.selectPaymentWidgetModalOption();
      await ecommercePage.clickOnConfirm();
    }
  );

  test(
    '@PI-T2129 Purchase denegado - MercadoPago + DEUNA 3DS - Challenge',
    {
      tag: [
        '@payments_integration',
        '@smoke',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsVisaFailedChallenge,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickOnPayButton();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await page.waitForTimeout(7000);
        await challenge3ds.selectSuccessChallengeCybersource();
      });

      await test.step('It is validated that the order has been processed with status denied', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied', 8, 9000);
      });
    }
  );
});
