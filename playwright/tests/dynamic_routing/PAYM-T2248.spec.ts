import { test, expect } from '@support/fixtures';
import { randomUUID } from 'crypto';
import * as processorsConfig from '@support/interfaces/payment_processors';

// Both stickiness checks are single coin-flips against a 50/50 split unless repeated:
// a single retry has a 50% chance of coincidentally matching firstPathName even if
// stickiness is completely broken, and a single independent transaction has no power
// at all to prove independence (any valid path passes regardless of whether the cache
// actually discriminates by transaction_id). Repeating enough times makes a false pass
// vanishingly unlikely while keeping a real bug's failure obvious.
const RETRY_COUNT = 10; // P(all N retries coincidentally match if broken) = 0.5^10 ~= 0.1%
const INDEPENDENCE_SAMPLE_SIZE = 20; // P(both paths never appear if independent) = 2 * 0.5^20 ~= 0.0002%

test.describe('@regression Routing by percentage split - stickiness', () => {
  let merchantId: string;
  let merchantToken: string;
  let ruleId: string;

  test.beforeAll(async ({ merchantAuthService, paymentService, paymentRoutingService }) => {
    const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;

    const stripeMerchantProcessorId = await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.stripeProcessor as any
    );

    const kushkiMerchantProcessorId = await paymentService.createPaymentProcessor(
      merchantId,
      merchantToken,
      processorsConfig.kushkiProcessor as any
    );

    // Payload shape (trigger, capabilities, data_type, enabled3ds, merchant_payment_processor_id)
    // mirrors the exact request the admin frontend sends when creating a default rule with a
    // split - trigger: 'payment' is accepted by the API but does not match how a real default
    // routing rule is configured.
    const rule = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'split stickiness test',
      description: '',
      priority: 1,
      status: 'enabled',
      is_default: true,
      trigger: 'merchant_rule',
      data_type: 'credit_card',
      members: [
        {
          payment_processor_id: processorsConfig.stripeProcessor.payment_processor_id,
          merchant_payment_processor_id: stripeMerchantProcessorId,
          sort: 1,
          capabilities: ['cvv'],
          strategy: 'split',
          enabled3ds: false,
          weight: 50,
          path_name: 'route_a',
        },
        {
          payment_processor_id: processorsConfig.kushkiProcessor.payment_processor_id,
          merchant_payment_processor_id: kushkiMerchantProcessorId,
          sort: 2,
          capabilities: ['cvv'],
          strategy: 'split',
          enabled3ds: false,
          weight: 50,
          path_name: 'route_b',
        },
      ],
    } as any);
    ruleId = rule.data.id;
  });

  test(
    '@PAYM-T2248 Routing by Percentage — split path assignment is sticky per transaction (no re-randomization on retry)',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ paymentRoutingService }) => {
      const transactionId = randomUUID();
      const body = {
        transaction_id: transactionId,
        method_type: 'credit_card',
        amount: 1000,
        store_code: 'STK01',
      };

      let firstPathName: string | undefined;

      await test.step('First evaluation assigns the order to one of the split paths', async () => {
        const response = await paymentRoutingService.evaluateTrigger(merchantId, body, merchantToken);
        const data = response.data as any;
        firstPathName = data.triggers[0].path_name;

        expect(['route_a', 'route_b']).toContain(firstPathName);
        expect(data.triggers[0].split_id).toBeTruthy();
      });

      await test.step(
        `Retrying the same transaction_id ${RETRY_COUNT} times always reuses the first path`,
        async () => {
          for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
            const response = await paymentRoutingService.evaluateTrigger(merchantId, body, merchantToken);
            const data = response.data as any;

            expect(data.triggers[0].path_name, `retry #${attempt} diverged from the first assignment`).toBe(
              firstPathName
            );
          }
        }
      );

      await test.step(
        `${INDEPENDENCE_SAMPLE_SIZE} distinct transaction_ids are evaluated independently of the first`,
        async () => {
          const observedPaths = new Set<string>();

          for (let i = 0; i < INDEPENDENCE_SAMPLE_SIZE; i++) {
            const response = await paymentRoutingService.evaluateTrigger(
              merchantId,
              { ...body, transaction_id: randomUUID() },
              merchantToken
            );
            const data = response.data as any;

            expect(['route_a', 'route_b']).toContain(data.triggers[0].path_name);
            observedPaths.add(data.triggers[0].path_name);
          }

          // Both paths must appear across enough independent transactions - a cache that
          // ignores transaction_id (e.g. keyed by merchant/rule only) would always return
          // firstPathName and never show the other one, which a single sample can't catch.
          expect(
            observedPaths.size,
            `expected both route_a and route_b across ${INDEPENDENCE_SAMPLE_SIZE} independent transactions, only saw: ${[...observedPaths]}`
          ).toBe(2);
        }
      );
    }
  );
});
