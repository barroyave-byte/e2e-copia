import { expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { kushkiProcessor } from '@support/interfaces/payment_processors/kushkiProcessor';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { kushkiMasterCardExitosa } from '@support/interfaces/credit_cards/kushkiCreditCards';
import { getValueByPathWithRetry } from '@support/utils/retries';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe('@regression Purchase kushki tokenizado', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await paymentService.configMerchantPspTokenization(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
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
    '@PI-T1861 Processor Tokenization - Tokenization at purchase time (send the CVV in the purchase)',
    {
      tag: ['@test_base', '@payments_integration', '@smoke', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-4590' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user inserts a credit card on payment widget', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.kushkiMasterCardExitosa,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('It is validated that the cvv has been sent', async () => {
        const transactionId = orderId;
        const jsonPathQuery = '$..is_cvv_present';
        const cvv2 = await getValueByPathWithRetry(
          page,
          transactionId,
          jsonPathQuery,
          merchantId,
          merchantToken
        );
        expect(cvv2).toBeTruthy();
        expect(cvv2[0]).toBe(true);
      });
    }
  );
});
