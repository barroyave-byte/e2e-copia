import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as validationCapture from '@support/interfaces/capture';
import * as validationRefund from '@support/interfaces/refund';
import * as validationVoid from '@support/interfaces/void';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import { retryOn409 } from '@support/utils/retries';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Refund with  MercadoPago MX',
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
      '@ENTP1-T1632 Check MX MP error al hacer void to refunded order',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
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

        await test.step('A capture is sent to the authorized transaction', async () => {
          await apiCallNewman.captureV2(
            validationCapture.captureSuccess,
            privateKey,
            3000,
            undefined,
            { orderToken }
          );
          await page.waitForTimeout(2000);
          await globalAssert.assertTransactionPaymentStatus('captured', privateKey, orderToken);
        });

        await test.step('The captured transaction is refunded', async () => {
          await retryOn409(() =>
            apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
              orderToken,
            })
          );
          await page.waitForTimeout(2000);
          await globalAssert.assertTransactionPaymentStatus('refunded', privateKey, orderToken);
        });

        await test.step('Validate error when trying to void transaction with status refunded', async () => {
          await apiCallNewman.voidOrder(
            validationVoid.errorVoidOrderRefunded,
            privateKey,
            0,
            orderToken
          );
          await globalAssert.assertTransactionPaymentStatus('refunded', privateKey, orderToken);
        });
      }
    );
  }
);
