import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as voidData from '@support/interfaces/void';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe(
  '@regression Pays with Conekta MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.conektaProcessor,
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

    test.fixme(
      '@ENTP1-T1930 Check Conekta Usuario Invitado Void a una transaccion con estado processed',
      {
        annotation: { type: 'bug', description: 'PI-1412' },
        tag: ['@payments_integration', '@team_payment_integration'],
      },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

        await test.step('The user inserts a credit card "conektaMasterCardSuccessful" from DeunaNow', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.conektaMasterCardSuccessful,
            { country: 'MX' }
          );
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
          const status = 'processed';
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus(status);
        });

        await test.step('void is made to processed order', async () => {
          await apiCallNewman.voidOrder(voidData.successVoid, privateKey, 0, orderToken); //TODO review Erika
          await page.waitForTimeout(1000);
          await globalAssert.assertTransactionPaymentStatus('voided', privateKey, orderToken);
        });
      }
    );
  }
);
