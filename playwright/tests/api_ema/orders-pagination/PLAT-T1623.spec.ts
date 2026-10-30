import { randomUUID } from 'crypto';
import { test } from '@support/fixtures';
import { ref, TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

test.describe('@regression Opensearch pagination for admin order', () => {
  test(
    '@PLAT-T1623 Opensearch pagination for admin order',
    { tag: ['@team_platform', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      const orderIds = [
        `PLAT-T1623-${randomUUID()}`,
        `PLAT-T1623-${randomUUID()}`,
        `PLAT-T1623-${randomUUID()}`,
      ];

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.kushkiProcessor },
          },

          // 3 paid orders for the merchant, each with a known order_id so the pagination
          // assertions below don't depend on response ordering or generated tokens.
          ...orderIds.flatMap((orderId) => [
            {
              action: 'setup.order.createOrder' as const,
              stepName: `Create order ${orderId}`,
              params: { country: 'MX' as const, options: { order_id: orderId } },
            },
            {
              action: 'api.payment.purchaseWithCreditCard' as const,
              stepName: `Pay order ${orderId}`,
              params: {
                creditCard: creditCardData.kushkiVisaSuccessfull,
                processorName: processorsConfig.kushkiProcessor.name,
              },
            },
          ]),

          // Page 1: GET /merchants/orders?page_size=2 (no cursor). minTotal waits out
          // OpenSearch's indexing lag so the 3rd purchase is counted before we assert.
          {
            action: 'api.orders.listOrders',
            stepName: 'Get page 1 of the orders list',
            params: { pageSize: 2, minTotal: 3 },
            saveAs: 'page1',
          },
          {
            action: 'api.orders.assertOrdersResponse',
            stepName: 'Assert page 1: 2 orders max, more records pending',
            params: {
              response: ref('page1'),
              expectedStatus: 200,
              expectedBody: { total: 3, there_are_more_records: true },
            },
          },

          // Page 2: GET /merchants/orders?page_size=2&cursor=<cursor from page 1> — this is
          // the exact request that returned EMA-9999 / HTTP 500 in the incident.
          {
            action: 'api.orders.listOrders',
            stepName: 'Get page 2 of the orders list using the cursor from page 1',
            params: { pageSize: 2, cursor: ref('page1').at('data.cursor') },
            saveAs: 'page2',
          },
          {
            action: 'api.orders.assertOrdersResponse',
            stepName: 'Assert page 2: no EMA-9999, remaining order, no more records',
            params: {
              response: ref('page2'),
              expectedStatus: 200,
              expectedBody: { total: 3, there_are_more_records: false },
            },
          },

          // Every order shows up exactly once across the two pages — no repeats, none missing.
          {
            action: 'api.orders.assertOrdersPagesCoverOrderIds',
            stepName: 'Assert the 3 orders are split across both pages without repeats',
            params: {
              firstPage: ref('page1'),
              secondPage: ref('page2'),
              expectedOrderIds: orderIds,
            },
          },
        ],
      });
    }
  );
});
