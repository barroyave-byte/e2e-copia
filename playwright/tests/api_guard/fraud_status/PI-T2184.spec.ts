import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { MERCADOPAGO_BINARY_MODE_DISABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

/**
 * Guards the Flybondi regression: the Purchase response stopped exposing the `fraud` field
 * for transactions placed in manual review, while GET Order kept returning it. What the
 * incident is about is the *presence* of the object in the immediate purchase response, so
 * that is what this spec pins down, on both sources at once.
 *
 * MercadoPago with binary mode disabled produces the PSP-side manual review this test case
 * describes. In that flow the platform answers with its default engine, which fills in the
 * processor, score and status but leaves risk_level, fraud_decision and the manual-review
 * state empty — so those values are asserted by PI-T2185, which drives a fraud engine
 * (Cybersource) into review and reproduces the incident payload field for field.
 */
test.describe('@regression Antifraud data in the Purchase response for manual review', () => {
  test(
    '@PI-T2184 Purchase response exposes antifraud data on manual review',
    { tag: ['@fraud', '@api', '@team_payment_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      // MercadoPago rejects a payer email it has already seen resolve to another test user.
      const payerEmail = `${crypto.randomUUID()}@testuser.com`;

      await testing.run({
        step: [
          {
            stepName: 'Create merchant',
            action: 'setup.merchant.basicSetup',
            params: { country: 'MX' },
          },
          {
            stepName: 'Create MercadoPago payment processor',
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.mercadoPagoProcessor },
            saveAs: 'processorId',
          },
          {
            stepName: 'Disable MercadoPago binary mode',
            action: 'setup.merchant.configurePayments',
            params: { configuration: MERCADOPAGO_BINARY_MODE_DISABLED },
          },
          {
            stepName: 'Tokenize an order',
            action: 'setup.order.createOrder',
            params: { country: 'MX', options: { user_email: payerEmail } },
          },
          {
            stepName: 'Execute Purchase with the manual-review card',
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.mercadoPagoVisaCardManualReview,
              processorName: processorsConfig.mercadoPagoProcessor.name,
              email: payerEmail,
            },
          },
          {
            stepName: 'Validate Purchase response status',
            action: 'api.payment.assertPurchaseStatus',
            params: {
              expectedStatus: 200,
              expectedBody: {
                order: {
                  payment: {
                    data: {
                      status: 'processing',
                      processor: processorsConfig.mercadoPagoProcessor.name,
                    },
                  },
                },
              },
            },
          },
          {
            stepName: 'Validate antifraud data is present in the Purchase response',
            action: 'api.payment.assertPurchaseFraudAnalysis',
            params: { populatedFields: ['processor', 'score', 'status'] },
            saveAs: 'purchaseFraudAnalysis',
          },
          {
            stepName: 'Validate GET Order exposes the same antifraud data',
            action: 'api.orders.assertOrderFraudAnalysis',
            params: { matches: ref('purchaseFraudAnalysis') },
          },
        ],
        cleanup: [
          {
            action: 'setup.processor.deleteProcessor',
            params: { processorId: ref('processorId') },
          },
        ],
      });
    }
  );
});
