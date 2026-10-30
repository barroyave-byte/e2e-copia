import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchant = new ConfigMerchant();

// TOKENIZE_ORDER_CHECKOUT_PSE is a CO order
test.describe('@regression Cash Payments from Checkout', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.posProcessor,
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
    '@PI-T1683 Compra completa con usuario invitado - POS',
    { tag: ['@payments_integration', '@preprod', '@purchase', '@team_payment_integration'] },
    async ({ page }) => {
      const deunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user selects the payment method Cash', async () => {
        await deunaNowPage.assertVisibleIfOnlyPaymentMethodIsAPM('Datafono (Terminal)');
      });

      await test.step('The user clicks pay', async () => {
        await deunaNowPage.clickPay();
      });

      await test.step('Validate the payment request returns status "pending"', async () => {
        await deunaNowPage.assertOrderStatusRequestPurchase('pending', 200);
      });

      await test.step('Validate that the order has been processed successfully with status "pending"', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('pending');
      });
    }
  );
});
