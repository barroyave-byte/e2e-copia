const globalAssert = new GlobalAssert();
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with OpenPay validate BIN and last four digits', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, { amount: 150000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PAYM-T2241 Validate BIN and last four digits of card for a transaction with open pay',
    {
      tag: ['@team_payments_capabilities', '@installments', '@preprod', '@installments_mci_msi'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      const installments = '3';

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
          })
        );
      });

      await test.step('It is validated that the status of the order is processed, the number of installments, the type installments', async () => {
        const bin = creditCardData.openpayVisaSuccessful.number.slice(0, 6);
        const lastFour = creditCardData.openpayVisaSuccessful.number.slice(-4);
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        const fromCard = orderResponse.data.order.payment.data.from_card;
        expect(fromCard.first_six, 'BIN (first 6 digits)').toEqual(bin);
        expect(fromCard.last_four, 'Last 4 digits').toEqual(lastFour);
        await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MSI', privateKey, orderToken);
      });
    }
  );
});
