import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as validationRefund from '@support/interfaces/refund';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { StatusTransaction } from '@tests/order_validate/validate_transactions';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with MercadoPago MX', () => {
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
    // TODO: orderId usage below needs migration to emaService response
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
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
    '@PAYM-T2243 Refund a transaction with processed status and validate the total refund amount',
    { tag: ['@team_payments_capabilities'] },
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

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });

      await test.step('Validate payment status in admin', async () => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });

      await test.step('The processed transaction is refunded and validate the total amount of the refund', async () => {
        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          3000,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: 3000,
          transactionCurrency: 'MXN',
          transactionStatus: StatusTransaction.Refunded,
          indexRefund: 0,
          skipTransactionId: true,
        });
      });

      const transactionId = orderId;
      await transactionTraceService.waitForValidTransactionVisibilityLogs(
        transactionId,
        merchantId,
        merchantToken
      );
    }
  );
});
