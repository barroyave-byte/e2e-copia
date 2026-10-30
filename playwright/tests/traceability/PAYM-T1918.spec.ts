import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const emaResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = emaResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cashProcessor,
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
    '@PAYM-T1918 Log Order Cash',
    { tag: ['@fixme_trace_preprod', '@team_payments_capabilities'] },
    async ({ page, emaService, transactionTraceService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user see the payment method Cash', async () => {
        await paymentDeunaNowPage.assertVisibleIfOnlyPaymentMethodIsAPM('Efectivo');
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('The checkout shows the screen with the order completed and message "¡Pago pendiente!"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending', 200);
        await apiCallNewman.assertTraceLogs(
          transactionTraceService,
          await apiCallNewman.getTraceTransactionIds(emaService, privateKey, orderToken),
          [
            {
              message: 'tl_payment_status_updated',
              payload: { payment_status: 'pending', payment_processor_name: 'cash' },
            },
          ],
          merchantId,
          merchantToken
        );
      });
    }
  );
});
