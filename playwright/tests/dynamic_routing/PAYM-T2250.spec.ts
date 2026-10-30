import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';

const STRIPE_ID = processorsConfig.stripeProcessor.payment_processor_id;
const KUSHKI_ID = processorsConfig.kushkiProcessor.payment_processor_id;

// Exact PAYROU error codes for each guardrail, from payments-routing's
// internal/code/rule_validation.go - asserting on `code` (stable) rather than just
// HTTP status (400 alone) or `description` (human-readable, more likely to change)
// proves the rule was rejected for the intended reason, not an unrelated 400.
const ERR_MEMBER_SPLIT_WEIGHTS_NOT_100 = 'PAYROU-01533'; // RuleSplitWeightsMustSumTo100
const ERR_MEMBER_SPLIT_REQUIRES_TWO = 'PAYROU-01535'; // RuleSplitRequiresAtLeastTwoMembers
const ERR_SPLIT_PATH_CANNOT_DECLINE = 'PAYROU-01541'; // RuleSplitPathCannotDecline
const ERR_NESTED_SPLITS_NOT_ALLOWED = 'PAYROU-01542'; // RuleNestedSplitsNotAllowed

test.describe('@regression Routing by percentage split - validation guardrails', () => {
  let merchantId: string;
  let merchantToken: string;
  let stripeMerchantProcessorId: string;
  let kushkiMerchantProcessorId: string;

  test.beforeAll(async ({ merchantAuthService, paymentService }) => {
    const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;

    stripeMerchantProcessorId = (await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.stripeProcessor as any
    )) as unknown as string;

    kushkiMerchantProcessorId = (await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.kushkiProcessor as any
    )) as unknown as string;
  });

  test(
    '@PAYM-T2250 Routing by Percentage — invalid split configurations are rejected at rule creation',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ paymentRoutingService }) => {
      await test.step('Path allocations that do not sum to 100% are rejected', async () => {
        const response = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
          label: 'invalid split - not 100 percent',
          description: '',
          priority: 1,
          status: 'enabled',
          is_default: true,
          trigger: 'merchant_rule',
          data_type: 'credit_card',
          members: [
            {
              payment_processor_id: STRIPE_ID,
              merchant_payment_processor_id: stripeMerchantProcessorId,
              sort: 1,
              capabilities: ['cvv'],
              strategy: 'split',
              enabled3ds: false,
              weight: 40,
              path_name: 'route_a',
            },
            {
              payment_processor_id: KUSHKI_ID,
              merchant_payment_processor_id: kushkiMerchantProcessorId,
              sort: 2,
              capabilities: ['cvv'],
              strategy: 'split',
              enabled3ds: false,
              weight: 40,
              path_name: 'route_b',
            },
          ],
        } as any);

        expect(response.status).toBe(400);
        expect((response.data as any)?.code).toBe(ERR_MEMBER_SPLIT_WEIGHTS_NOT_100);
        expect((response.data as any)?.id).toBeFalsy();
      });

      await test.step('A path fewer than the 2-path minimum is rejected', async () => {
        const response = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
          label: 'invalid split - single path',
          description: '',
          priority: 2,
          status: 'enabled',
          is_default: true,
          trigger: 'merchant_rule',
          data_type: 'credit_card',
          members: [
            {
              payment_processor_id: STRIPE_ID,
              merchant_payment_processor_id: stripeMerchantProcessorId,
              sort: 1,
              capabilities: ['cvv'],
              strategy: 'split',
              enabled3ds: false,
              weight: 100,
              path_name: 'route_a',
            },
          ],
        } as any);

        expect(response.status).toBe(400);
        expect((response.data as any)?.code).toBe(ERR_MEMBER_SPLIT_REQUIRES_TWO);
        expect((response.data as any)?.id).toBeFalsy();
      });

      await test.step('A path pointing to Decline is rejected', async () => {
        const response = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
          label: 'invalid split - decline path',
          priority: 3,
          status: 'enabled',
          is_default: true,
          trigger: 'merchant_rule',
          conditions: [],
          split: true,
          children: [
            {
              weight: 50,
              path_name: 'route_a',
              trigger: 'reject',
              members: [],
              conditions: [],
            },
            {
              weight: 50,
              path_name: 'route_b',
              members: [
                { payment_processor_id: KUSHKI_ID, sort: 1, capabilities: ['cvv'], strategy: 'cascade' },
              ],
              conditions: [],
            },
          ],
        } as any);

        expect(response.status).toBe(400);
        expect((response.data as any)?.code).toBe(ERR_SPLIT_PATH_CANNOT_DECLINE);
        expect((response.data as any)?.id).toBeFalsy();
      });

      await test.step('A path pointing to another Split (nested split) is rejected', async () => {
        const response = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
          label: 'invalid split - nested split',
          priority: 4,
          status: 'enabled',
          is_default: true,
          trigger: 'merchant_rule',
          conditions: [],
          split: true,
          children: [
            {
              weight: 50,
              path_name: 'route_a',
              members: [
                { payment_processor_id: STRIPE_ID, sort: 1, capabilities: ['cvv'], strategy: 'cascade' },
              ],
              conditions: [],
            },
            {
              weight: 50,
              path_name: 'route_b',
              split: true,
              conditions: [],
              children: [
                {
                  weight: 50,
                  path_name: 'inner_a',
                  members: [
                    { payment_processor_id: KUSHKI_ID, sort: 1, capabilities: ['cvv'], strategy: 'cascade' },
                  ],
                  conditions: [],
                },
                {
                  weight: 50,
                  path_name: 'inner_b',
                  members: [
                    { payment_processor_id: STRIPE_ID, sort: 1, capabilities: ['cvv'], strategy: 'cascade' },
                  ],
                  conditions: [],
                },
              ],
            },
          ],
        } as any);

        expect(response.status).toBe(400);
        expect((response.data as any)?.code).toBe(ERR_NESTED_SPLITS_NOT_ALLOWED);
        expect((response.data as any)?.id).toBeFalsy();
      });
    }
  );
});
