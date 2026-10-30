import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import { test } from '@support/fixtures';

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

  test.beforeAll(async ({ emaService }) => {
    // Config Merchant
    const merchant = await configMerchantCheckout.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // Create Statsig feature flag. The rule name carries this run's merchantId so two
    // executions never write the same rule.
    //
    // This used to be a fixed name, which forced a cleanup step here: it looked for a rule
    // with that name and deleted it before creating its own. That reclaimed orphans from
    // crashed runs, but it could not tell an orphan from a rule a concurrent run was using,
    // and deleted it out from under it. A name that embeds a freshly created merchantId
    // cannot pre-exist, so there is nothing to reclaim and nothing to delete by mistake.
    const statsigRuleName = configStatsig.uniqueRuleName(
      RuleNames.MerchantsThatUseMultiCaptureWithLockCompleteAmountTests,
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
      throw new Error(`Statsig did not return a rule id for "${statsigRuleName}"`);
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
    '@PAYM-T2207 Multiple partial captures complete the authorized amount',
    { tag: ['@payments_integration', '@smoke', '@team_payment_integration'] },
    async ({ page, paymentService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user navigates to the checkout screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
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

      await test.step('Given authorization amount of 3000, perform 30 parallel capture requests for the same order_id, each with an amount of 100', async () => {
        const captureRequests = [];
        const captureAmount = 100;
        const numberOfRequest = 30;
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
        await adminOrderDetailsPage.assertPaymentStatus('captured', 5, 3000);
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
