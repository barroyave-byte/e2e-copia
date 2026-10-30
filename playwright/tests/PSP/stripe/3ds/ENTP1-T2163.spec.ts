import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { CheckoutPage } from '@pages/explore/checkoutPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { NextActionPage } from '@pages/explore/nextActionPage';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Next Action Widget',
  { tag: ['@checkout', '@explore', '@card_form'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeDeunaCheckoutOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2163 Next Action: 3ds Success',
      { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        let checkoutPage = new CheckoutPage(page);
        const nextActionPage = new NextActionPage(page);

        await test.step('The user navigates to forms', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('The user fills credit card information and opens next action widget', async () => {
          const page3DS = page.waitForEvent('popup');
          await checkoutPage.fillCreditCardData(creditCardData.stripe3dsPass);

          await test.step('The user completes the 3DS challenge', async () => {
            // Wait for the 3DS popup to open
            checkoutPage = new CheckoutPage(page);
            await checkoutPage.clickOnButtonFinalizePurchase(true);
            await nextActionPage.assertGoToSiteButtonVisible();

            const challenge3ds = new Challenge3dsPage(await page3DS);
            await challenge3ds.selectPassChallengeStripe();
          });
        });

        await test.step('Order is validated through admin', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
