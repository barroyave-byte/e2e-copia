import { test, expect } from '@support/fixtures';
import { randomUUID } from 'crypto';
import * as processorsConfig from '@support/interfaces/payment_processors';

const SAMPLE_SIZE = 100;
const CONCURRENCY = 12;
const TARGET_PERCENTAGE = { route_a: 30, route_b: 70 };
const TOLERANCE_PERCENTAGE_POINTS = 15;

async function runWithConcurrency<T>(count: number, limit: number, task: (index: number) => Promise<T>): Promise<T[]> {
  const results: T[] = new Array(count);
  let next = 0;

  async function worker() {
    while (next < count) {
      const current = next++;
      results[current] = await task(current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, count) }, () => worker()));
  return results;
}

test.describe('@regression Routing by percentage split - traffic distribution', () => {
  let merchantId: string;
  let merchantToken: string;

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
      label: 'split distribution test 30/70',
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
          weight: TARGET_PERCENTAGE.route_a,
          path_name: 'route_a',
        },
        {
          payment_processor_id: processorsConfig.kushkiProcessor.payment_processor_id,
          merchant_payment_processor_id: kushkiMerchantProcessorId,
          sort: 2,
          capabilities: ['cvv'],
          strategy: 'split',
          enabled3ds: false,
          weight: TARGET_PERCENTAGE.route_b,
          path_name: 'route_b',
        },
      ],
    } as any);
  });

  test(
    '@PAYM-T2249 Routing by Percentage — observed traffic distribution approximates the configured split (30/70)',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ paymentRoutingService }) => {
      const pathCounts: Record<string, number> = { route_a: 0, route_b: 0 };

      await test.step(`Evaluate ${SAMPLE_SIZE} independent transactions against the split rule`, async () => {
        const pathNames = await runWithConcurrency(SAMPLE_SIZE, CONCURRENCY, async () => {
          const response = await paymentRoutingService.evaluateTrigger(
            merchantId,
            {
              transaction_id: randomUUID(),
              method_type: 'credit_card',
              amount: 1000,
              store_code: 'DST01',
            },
            merchantToken
          );
          const data = response.data as any;
          return data.triggers[0].path_name as string;
        });

        for (const pathName of pathNames) {
          expect(['route_a', 'route_b']).toContain(pathName);
          pathCounts[pathName] += 1;
        }
      });

      await test.step('Observed distribution is within tolerance of the configured percentages', async () => {
        const observedPercentageA = (pathCounts.route_a / SAMPLE_SIZE) * 100;
        const observedPercentageB = (pathCounts.route_b / SAMPLE_SIZE) * 100;

        console.log(
          `[INFO] --> route_a: ${pathCounts.route_a}/${SAMPLE_SIZE} (${observedPercentageA.toFixed(1)}%), ` +
          `route_b: ${pathCounts.route_b}/${SAMPLE_SIZE} (${observedPercentageB.toFixed(1)}%)`
        );

        expect(
          Math.abs(observedPercentageA - TARGET_PERCENTAGE.route_a),
          `route_a observed ${observedPercentageA.toFixed(1)}% vs target ${TARGET_PERCENTAGE.route_a}%`
        ).toBeLessThanOrEqual(TOLERANCE_PERCENTAGE_POINTS);

        expect(
          Math.abs(observedPercentageB - TARGET_PERCENTAGE.route_b),
          `route_b observed ${observedPercentageB.toFixed(1)}% vs target ${TARGET_PERCENTAGE.route_b}%`
        ).toBeLessThanOrEqual(TOLERANCE_PERCENTAGE_POINTS);
      });
    }
  );
});
