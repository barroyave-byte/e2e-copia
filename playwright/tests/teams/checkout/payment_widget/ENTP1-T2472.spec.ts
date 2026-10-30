import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { CheckoutPage } from '@pages/explore/checkoutPage';
import { NextActionPage } from '@pages/explore/nextActionPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { WebSdkVersion } from '@support/interfaces/experienceTypesExplore';
import { CommonsActions } from '@pages/commonActions';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';

const configMerchantCheckout = new ConfigMerchantCheckout();

interface Parameters {
  webSdkVersion: WebSdkVersion;
  testName: string;
}

const parameters: Parameters[] = [
  { webSdkVersion: 'v1.0', testName: 'WebSDK v1.0' },
  { webSdkVersion: 'v1.2', testName: 'WebSDK v1.2' },
  { webSdkVersion: 'v1.3', testName: 'WebSDK v1.3' },
  { webSdkVersion: 'v1.4', testName: 'WebSDK v1.4' },
];
const metadata = {
  processorName: 'stripe_direct',
  paymentMethod: 'credit_card',
};

test.describe(
  '@regression Stripe: Next Action Widget 3DS validates paymentMethods3dsInitiated event',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2472 Stripe: Next Action Widget 3DS validates paymentMethods3dsInitiated event',
      { tag: ['@team_enterprise', '@smoke'] },
      async ({ page, emaService }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new PaymentPage(page);
        let checkoutPage = new CheckoutPage(page);
        const nextActionPage = new NextActionPage(page);
        const commonActions = new CommonsActions(page);

        for (const { webSdkVersion, testName } of parameters) {
          await test.step(`Testing with ${testName}`, async () => {
            await test.step('Create new order', async () => {
              const tokenized = await emaService.tokenizeDeunaCheckoutOrder('MX', privateKey);
              orderToken = tokenized.data.token;
              orderId = tokenized.data.order.order_id;
            });

            await test.step('The user navigates to forms', async () => {
              const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
              await testingTool.navigateAndSetup({
                orderToken: orderToken,
                webSdkVersion,
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
                await paymentPage.assertEventWasFired('paymentMethods3dsInitiated', metadata);

                const challenge3ds = new Challenge3dsPage(await page3DS);
                await challenge3ds.selectPassChallengeStripe();
              });
            });

            await test.step('Order is validated through admin', async () => {
              await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
              await adminOrderDetailsPage.assertPaymentStatus('processed');
            });
          });
        }
      }
    );
  }
);
