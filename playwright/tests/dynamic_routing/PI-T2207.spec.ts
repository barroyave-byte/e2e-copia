import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CybersourceProcessor } from '@support/interfaces/payment_processors/cybersourceProcessor';

/**
 *
 * This spec covers the happy path of the Zephyr case: two CyberSource affiliations behind a
 * cascade rule (affiliation 1 → affiliation 2), one purchase that affiliation 1 approves, and
 * proof that the order was charged once, through affiliation 1 — the invoice holds a single
 * charge operation and none was sent for affiliation 2.
 *
 */

const affiliation1: CybersourceProcessor = {
  ...processorsConfig.cybersourceProcessor_BR,
  country_iso: 'MX',
  currency_iso3: 'MXN',
};

const affiliation2: CybersourceProcessor = {
  ...affiliation1,
  name: 'cybersource_2',
};

const CYBERSOURCE_PROCESSOR_ID = 45;

test.describe('@regression Dynamic routing - cascade between two CyberSource affiliations', () => {
  test(
    '@PI-T2207 Cybersource duplicate charge cascade',
    { tag: ['@dynamic_routing', '@team_payments_capabilities', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: affiliation1 },
            saveAs: 'affiliation1Id',
          },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: affiliation2 },
            saveAs: 'affiliation2Id',
          },
          {
            action: 'setup.routing.createCascadeRule',
            params: {
              members: [
                {
                  paymentProcessorId: CYBERSOURCE_PROCESSOR_ID,
                  merchantPaymentProcessorId: ref('affiliation1Id'),
                },
                {
                  paymentProcessorId: CYBERSOURCE_PROCESSOR_ID,
                  merchantPaymentProcessorId: ref('affiliation2Id'),
                },
              ],
            },
          },
          { action: 'setup.order.createOrder', params: { country: 'MX' } },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.cybersourceVisaCardSuccessful,
              processorName: affiliation1.name,
              transactionId: crypto.randomUUID(),
            },
          },
          { action: 'api.payment.assertPurchaseStatus', params: { expectedStatus: 200 } },
          // Right after the purchase the order can still come back without its payment
          // (status "", no merchant_payment_processor_id).
          { action: 'api.orders.waitForOrderStatus', params: { status: 'processing' } },
          { action: 'api.orders.getOrder', saveAs: 'order' },
          {
            action: 'api.orders.getProcessorTransactions',
            params: { untilTypes: ['purchase'] },
            saveAs: 'transactions',
          },
          {
            action: 'api.orders.assertSingleSuccessfulCharge',
            params: {
              order: ref('order'),
              transactions: ref('transactions'),
              expectedMerchantPaymentProcessorId: ref('affiliation1Id'),
              expectedStatus: 'processing',
            },
          },
        ],
        cleanup: [
          {
            action: 'setup.processor.deleteProcessor',
            params: { processorId: ref('affiliation1Id') },
          },
          {
            action: 'setup.processor.deleteProcessor',
            params: { processorId: ref('affiliation2Id') },
          },
        ],
      });
    }
  );
});
