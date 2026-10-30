import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { PaymentWidgetFormPage } from '@pages/explore/forms/payment_widget/paymentWidgetFormPage';
import { createRedeAirlineOrder } from './redeAirlineOrder';

const configMerchant = new ConfigMerchant();

test.describe('@regression @PF-T175 REDE BR - DEUNA 3DS MPI Unsuccessful Step-Up Authentication', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      createRedeAirlineOrder()
    );
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.rede3DSProcessor,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PF-T175 REDE BR - DEUNA 3DS MPI Unsuccessful Step-Up Authentication',
    { tag: ['@payments_integration', '@team_payconnect', '@preprod', '@authorization'] },
    async ({ page }) => {
      const paymentWidgetFormPage = new PaymentWidgetFormPage(page, 'PT');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersource3dsVisaFailedChallenge,
          { country: 'BR' }
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

      await test.step('It is validated that the order has been denied after unsuccessful authentication', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied', 8, 9000);
      });
    }
  );
});
