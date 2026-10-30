import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchantCheckout = new ConfigMerchantCheckout();
const configStatsig = new ConfigStatsig();

test.describe('@regression Executing multiple partial captures V2 in parallel with Kushki MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;
  /** Rule this spec created in Statsig, deleted in afterAll. */
  let statsigRuleId: string;
  let responsePurchase: any;
  let purchasePayload: ReturnType<typeof buildPurchaseV2Payload>;

  test.beforeAll(async ({ emaService }) => {
    // Config Merchant
    const merchant = await configMerchantCheckout.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    // Create Statsig feature flag. The rule name carries this run's merchantId so two
    // executions never write the same rule: the name used to be fixed, and a second run
    // against the same gate collided with it.
    const statsigRuleName = configStatsig.uniqueRuleName(
      RuleNames.MerchantsThatUseMultiCaptureWithLockNotCompleteAmountTests,
      merchantId
    );
    const statsigResponse = await configStatsig.createFeatureFlagRuleWithKeys([
      { key: 'merchant_id', value: merchantId },
      {
        key: 'rule_id',
        value: statsigRuleName,
      },
      { key: 'feature_flag_id', value: FlagNames.ShouldUseMultiCaptureWithLock },
    ]);

    if (statsigResponse && statsigResponse.ruleId) {
      statsigRuleId = statsigResponse.ruleId;
    } else {
      throw new Error(
        `Statsig did not return a rule id for "${statsigRuleName}". The merchant is created ` +
          'fresh per run, so the name cannot collide: check the gate write in the Statsig console ' +
          '(https://console.statsig.com/).'
      );
    }
    // Create Order
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    // Create Merchant Payment Processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorizeMPC,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2206 Multiple partial captures do not complete the authorized amount',
    { tag: ['@payments_integration', '@smoke', '@team_payment_integration'] },
    async ({ paymentService, userAuthService, emaService }) => {
      let userToken: string;

      await test.step('The user navigates to the checkout screen as guest user', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        userToken = responseUserAuth.data.token;
      });

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        purchasePayload = buildPurchaseV2Payload({
          country: 'MX',
          processorName: processorsConfig.kushkiProcessorAuthorizeMPC.name,
          card: creditCardData.kushkiVisaSuccessfull,
          token: orderToken,
        });
      });

      await test.step('The user clicks on pay', async () => {
        responsePurchase = await paymentService.purchaseV2(privateKey, userToken, purchasePayload);
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('The Statsig rule is live for this merchant', async () => {
        // The multi-capture lock is only applied once the service reading the gate has
        // downloaded the rule created in beforeAll; wait out whatever is left of that
        // window before firing the captures. No-ops when the setup already covered it.
        await configStatsig.pollUntilRuleIsLive(
          FlagNames.ShouldUseMultiCaptureWithLock,
          merchantId
        );
      });

      await test.step('Given authorization amount of 3000, perform 10 parallel capture requests for the same order_id, each with an amount of 100', async () => {
        const captureRequests = [];
        const captureAmount = 100;
        const numberOfRequest = 10;
        for (let i = 0; i < numberOfRequest; i++) {
          captureRequests.push(
            paymentService.captureV2(privateKey, orderToken, {
              amount: captureAmount,
            })
          );
        }
        await Promise.all(captureRequests);
      });

      await test.step('It is validated that the captures has been processed successfully and the order status capturing', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_capturing', 5, 3000);
      });
    }
  );

  test.afterAll(async () => {
    if (statsigRuleId) {
      await test.step('Remove Test Feature Flag', async () => {
        await configStatsig.deleteFeatureFlagRuleWithKeys([
          { key: 'merchant_id', value: merchantId },
          {
            key: 'rule_id',
            value: statsigRuleId,
          },
          { key: 'feature_flag_id', value: FlagNames.ShouldUseMultiCaptureWithLock },
        ]);
      });
    }
  });
});
