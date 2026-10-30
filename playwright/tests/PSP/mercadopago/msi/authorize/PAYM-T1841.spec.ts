import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();
let orderId: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;
let orderToken: string;

test.describe('@regression Buy with deuna now using installments', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const result = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'test123@testuser.com',
      amount: 250000,
    });
    orderToken = result.data.token;
    orderId = result.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorAuthorizeMSI,
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
    '@PAYM-T1841 Authorize installments 6 meses - MercadoPago usuario invitado- DEUNA NOW',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page, transactionTraceService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const installments = '6';

      await paymentDeunaNowPage.userGuest();

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadopagoMasterCardSuccessfulMX,
          { country: 'MX' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the status of the order is authorized, the number of installments and the type of installments', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
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
