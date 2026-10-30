import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import { retryGetOrderStatus } from '@support/utils/retries';

let configMerchant = new ConfigMerchant();
let configStatsig = new ConfigStatsig();

test.describe('@regression Pay with unknown credit card', () => {
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
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessor,
      merchantId,
      merchantToken
    );

    // Create Statsig feature flag
    // Rule name is suffixed with merchantId so parallel runs of this spec (multiple
    // workers/repeats) don't collide on the same Statsig gate rule name.
    const uniqueRuleName = `${RuleNames.MerchantsReturnUnknownCards}-${merchantId}`;
    const statsigResponse = await configStatsig.createFeatureFlagRuleWithKeys([
      { key: 'merchant_id', value: merchantId },
      {
        key: 'rule_id',
        value: uniqueRuleName,
      },
      { key: 'feature_flag_id', value: FlagNames.ShouldReturnUnknownCards },
    ]);

    if (statsigResponse && statsigResponse.ruleId) {
      statsigRuleId = statsigResponse.ruleId;
    } else {
      throw new Error(
        `Rule ${uniqueRuleName} already exists in Statsig.` +
          'Please delete it manually through the Statsig console (https://console.statsig.com/) or via API before running this test.'
      );
    }
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
    '@PI-T2169 Pay with unknown credit card',
    { tag: ['@bin_detector', '@payments_integration', '@team_payment_integration'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.dlocalUnknownCardSuccessful,
          {
            country: 'CL',
          }
        );
      });

      await test.step('The Statsig rule is live for this merchant', async () => {
        // The bin detector only returns "unknown" once the service reading the gate has
        // downloaded the rule created in beforeAll. The setup before this point does not
        // cover that window on its own, so wait out whatever is left before paying.
        await configStatsig.pollUntilRuleIsLive(FlagNames.ShouldReturnUnknownCards, merchantId);
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate purchase response', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        const responsePurchase = await paymentDeunaNowPage.responsePromise;
        const responsePurchaseBody = await responsePurchase.json();
        expect(responsePurchaseBody.order.payment.data.from_card.card_brand).toBe('unknown');
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
          { key: 'feature_flag_id', value: FlagNames.ShouldReturnUnknownCards },
        ]);
      });
    }
  });
});
