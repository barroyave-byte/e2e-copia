import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

const INSTALLMENTS_CASES = ['3', '6'] as const;

test.describe('@regression Buy with deuna now using installments', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.payUProcessorAuthorize,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PI-T536 Authorize installments 3 y 6 meses - PayU usuario invitado- DEUNA NOW',
    {
      tag: [
        '@preprod',
        '@authorization',
        '@payments_integration',
        '@installments',
        '@team_payment_integration',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      const status = 'authorized';

      for (const installments of INSTALLMENTS_CASES) {
        await test.step(`${installments} meses`, async () => {
          await test.step('The user opens the testing page and opens the required widget', async () => {
            const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
              amount: 250000,
            });
            orderToken = tokenized.data.token;
            orderId = tokenized.data.order.order_id;
          });

          await test.step(`The user send purchase request with ${installments} MSI installments`, async () => {
            const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
            const userToken = responseUserAuth.data.token;
            responsePurchase = await paymentService.purchaseV2(
              privateKey,
              userToken,
              buildPurchaseV2Payload({
                country: 'MX',
                processorName: processorsConfig.payUProcessorAuthorize.name,
                card: creditCardData.payUMasterCardSuccessful,
                token: orderToken,
                installments: Number(installments),
              })
            );
          });

          await test.step('It is validated that the status of the order is authorized, the number of installments and the type of installments', async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, status);
            await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
            await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
          });
        });
      }
    }
  );
});
