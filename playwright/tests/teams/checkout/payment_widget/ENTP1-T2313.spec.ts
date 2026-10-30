import { EmailGenerator } from '@support/utils/EmailGenerator';
import { Page, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { CheckoutPage } from '@pages/explore/checkoutPage';

const configMerchant = new ConfigMerchant();

const widgetGeneralsConfig = {
  user_experience: {
    render_3ds_strategy: 'iframe',
  },
};

test.describe(
  '@regression Unlimit - Payconnect: next-action-purchase denied 3DS purchase',
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
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: EmailGenerator.generatePayerEmail(),
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.unlimitProcessorPayconnectWithThreeDS,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
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
      '@ENTP1-T2313 Unlimit - Payconnect: next-action-purchase denied 3DS purchase',
      { tag: ['@payment_widget', '@team_enterprise', '@smoke'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const checkoutPage = new CheckoutPage(page);

        await test.step('User enters credit card data and selects payment method', async () => {
          await checkoutPage.fillCreditCardData(creditCardData.unlimitThreeDSProcessed);
          await checkoutPage.clickOnCreditCard();
        });

        await test.step('User finalizes purchase and 3DS iframe appears', async () => {
          await checkoutPage.clickOnButtonFinalizePurchase(true);
          await paymentDeunaNowPage.assertIframe3dsVisible();
        });

        await test.step('User fails the 3DS challenge and APM redirect iframe appears', async () => {
          const challenge3ds = new Challenge3dsPage(
            paymentDeunaNowPage.iframe3ds as unknown as Page
          );
          await challenge3ds.selectFailedChallengeUnlimit();
          await paymentDeunaNowPage.assertIframeAPMRedirectVisible();
        });

        await test.step('Error messages are shown in the APM redirect iframe', async () => {
          await paymentDeunaNowPage.assertApmRedirectErrorMessages();
        });

        await test.step('Order status is checked in admin and is "denied"', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('denied');
        });
      }
    );
  }
);
