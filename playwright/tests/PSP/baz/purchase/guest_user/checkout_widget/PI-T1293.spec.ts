import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

const INSTALLMENTS_CASES = ['3', '6'] as const;

test.describe('@regression BAZ Purchase Installments MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bazProcessor_MX,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PI-T1293 Purchase exitoso Mastercard MSI 3 y 6 con BAZ usando checkout widget en Mexico',
    { tag: ['@payments_integration', '@fixme_baz_preprod', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      for (const installments of INSTALLMENTS_CASES) {
        await test.step(`${installments} meses`, async () => {
          await test.step('The user send purchase request', async () => {
            const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
              amount: 250000,
            });
            orderToken = tokenized.data.token;
            orderId = tokenized.data.order.order_id;
            const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
            const userToken = responseUserAuth.data.token;
            responsePurchase = await paymentService.purchaseV2(
              privateKey,
              userToken,
              buildPurchaseV2Payload({
                country: 'MX',
                processorName: processorsConfig.bazProcessor_MX.name,
                card: creditCardData.bazMastercardSuccessful,
                token: orderToken,
                installments: Number(installments),
              })
            );
          });

          await test.step('It is validated that the status of the order is processed, the number of installments and the type of installments', async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
            await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
            await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
            await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
          });
        });
      }
    }
  );
});
