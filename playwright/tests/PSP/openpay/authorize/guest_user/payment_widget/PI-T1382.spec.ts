import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with OpenPay MX', () => {
  let privateKey: string;
  let orderToken: string;
  let merchantId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, paymentRoutingService, paymentService }) => {
    const {
      merchantId: setupMerchantId,
      merchantToken,
      privateKey: merchantPrivateKey,
    } = await configMerchant.basicSetup('MX');
    merchantId = setupMerchantId;
    privateKey = merchantPrivateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;

    // Simulate n-processors in order to check the fix PI-2361
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorize,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessorAuthorize,
      merchantId,
      merchantToken
    );
    const processorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessorAuthorizeWithTokenizeOnPurchase,
      merchantId,
      merchantToken
    );

    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Default',
      conditions: [{ operand: '424242', operator: 'in', rule_option: { id: 2, label: 'bin' } }],
      isTransact: true,
      is_default: false,
      trigger: 'payment',
      children: [],
      ignore_next_rules: true,
      priority: 2,
      status: 'enabled',
      members: [
        {
          payment_processor_id: 34,
          capabilities: ['cvv'],
          sort: 1,
          merchant_payment_processor_id: processorID,
          strategy: 'cascade',
        },
      ],
    });
    await paymentService.createConfigMerchantPayments(
      USE_DYNAMIC_ROUTING_ENABLED,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1382 Try authorize a payment success with multiples processors',
    { tag: ['@payments_integration', '@flaky', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayProcessorAuthorizeWithTokenizeOnPurchase.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Validate name processor is "openpay"', async () => {
        const objProcessorName: string = 'openpay';
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(orderResponse.data.order.payment.data.processor).toBe(objProcessorName);
      });
    }
  );
});
