import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as validationVoid from '@support/interfaces/void';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';
import { test } from '@support/fixtures';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe(
  '@regression Pays with  MercadoPago MX',
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: 'test@testuser.com',
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessorAuthorize,
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
      '@ENTP1-T1073 Check MX Usuario Invitado MP Void a una transaccion autorizada',
      {
        tag: ['@payments_integration', '@team_payment_integration'],
      },
      async ({ page, transactionTraceService }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        await test.step('The user inserts a credit card "mercadopago_exitosa" from DeunaNow', async () => {
          await paymentDeunaNowPage.userGuest();
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.mercadopagoMasterCardSuccessful,
            { country: 'MX' }
          );
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);

          await page.waitForTimeout(5000);
          await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
        });
        await test.step('A void is sent to the authorized transaction', async () => {
          await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
          await page.waitForTimeout(2000);
          await globalAssert.assertTransactionPaymentStatus('voided', privateKey, orderToken);
        });

        const transactionId = orderId;
        await transactionTraceService.waitForValidTransactionVisibilityLogs(
          transactionId,
          merchantId,
          merchantToken
        );
      }
    );
  }
);
