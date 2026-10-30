import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

test.describe('@regression Buy with deuna now using installments', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, { amount: 250000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSIwithError('MXN', merchantId, merchantToken);
  });

  test(
    '@PAYM-T1416 Purchase installments 2 meses (error) - OpenPay usuario invitado - DEUNA NOW',
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
      const installments = '2';

      await test.step(`The user send purchase request with ${installments} MSI installments`, async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayProcessor.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
            installments: Number(installments),
          }),
          true
        );
      });

      await test.step('It is validated that the status of the order is denied, the number of installments and the type of installments', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
        await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
      });
    }
  );
});
