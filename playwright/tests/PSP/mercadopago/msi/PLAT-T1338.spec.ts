import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';
const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();

test.describe('@regression Pay Form DeunaNow Failed MSI', () => {
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
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
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
    '@PLAT-T1338 Validacion orden rechazada por fraude con procesador Mercadopago TC-MASTER usuario invitado y con MSI- DEUNA NOW',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page, transactionTraceService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const installments = '3';

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.userGuest();
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadoPagoVisaCardFailed,
          { country: 'MX' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been denied', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
      });

      // TODO: migrate getOrderId() to use emaService order token
      const transactionId = orderId;
      await transactionTraceService.waitForValidTransactionVisibilityLogs(
        transactionId,
        merchantId,
        merchantToken
      );
    }
  );
});
