import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
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
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.wompiProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
  });

  test(
    '@PAYM-T2074 Purchase installments 3 meses with installments_plan_option_id Wompi',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@preprod',
        '@installments_mci_msi',
        '@team_payment_integration',
      ],
    },
    async ({ paymentService, paymentMsiService, userAuthService, emaService }) => {
      const installments = '3';

      await test.step(`The user send purchase request with ${installments} MCI installments`, async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        const orderInstallments = await paymentMsiService.getOrderInstallments(
          orderToken,
          publicKey,
          creditCardData.wompiVisaSuccessfull.number.slice(0, 6)
        );
        const planOption = (orderInstallments.data.installments as any[]).find(
          (option) => option.installments === Number(installments)
        );
        if (!planOption) {
          throw new Error(`No plan option for ${installments} installments`);
        }
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.wompiProcessor.name,
            card: creditCardData.wompiVisaSuccessfull,
            token: orderToken,
            installments: Number(installments),
            planOptionId: planOption.plan_option_id,
          })
        );
      });

      await test.step('It is validated that the status of the order is processed, the number of installments and the type of installments', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MCI', privateKey, orderToken);
      });
    }
  );
});
