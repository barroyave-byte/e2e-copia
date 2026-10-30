import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

const INSTALLMENTS_CASES = [
  { installments: '3', card: creditCardData.openpayMastercardSuccessful },
  { installments: '6', card: creditCardData.openpayVisaSuccessful },
] as const;

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
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PAYM-T1411 Purchase installments 3 y 6 meses - OpenPay usuario invitado - DEUNA NOW',
    {
      tag: [
        '@installments',
        '@preprod',
        '@purchase',
        '@installments_mci_msi',
        '@team_payment_integration',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      for (const { installments, card } of INSTALLMENTS_CASES) {
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
                processorName: processorsConfig.openPayProcessor.name,
                card,
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
