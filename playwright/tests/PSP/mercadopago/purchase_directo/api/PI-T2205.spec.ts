import * as crypto from 'crypto';
import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import { BaseCreditCard } from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

// Card from the Zephyr steps (MercadoPago test Visa, holder APRO APRO = approved).
const MERCADOPAGO_APPROVED_CARD: BaseCreditCard = {
  number: '4075595716483764',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '123456789',
};

/**
 * Regression cover for RIS-483 (panic-payment-production): re-purchasing an order that already
 * reached a terminal state, with the same order token and a new transaction_id, made the
 * payment service panic (findInvoiceByInvoiceId / updateWithPessimistLock failed with SQLSTATE
 * 08P01 after a schema drift), blocking orders. Expected behaviour: the second purchase is
 * rejected cleanly (staging answers 409 EMA-1004 "request already processed"), with no 500.
 */
test.describe('@regression MercadoPago - Re-purchase of an order', () => {
  test(
    '@PI-T2205 Reused order_token with new transaction_id',
    { tag: ['@api', '@team_payment_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });
      const payerEmail = `${crypto.randomUUID()}@testuser.com`;

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.mercadoPagoProcessor },
            saveAs: 'processorId',
          },
          {
            action: 'setup.order.createOrder',
            params: { country: 'MX', options: { user_email: payerEmail } },
          },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: MERCADOPAGO_APPROVED_CARD,
              processorName: processorsConfig.mercadoPagoProcessor.name,
              email: payerEmail,
              transactionId: crypto.randomUUID(),
            },
          },
          { action: 'api.payment.assertPurchaseStatus', params: { expectedStatus: 200 } },
          {
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: MERCADOPAGO_APPROVED_CARD,
              processorName: processorsConfig.mercadoPagoProcessor.name,
              email: payerEmail,
              transactionId: crypto.randomUUID(),
              expectError: true,
            },
          },
          {
            stepName: 'Re-purchase is rejected as already processed (no 5xx / panic)',
            action: 'api.payment.assertPurchaseStatus',
            params: {
              expectedStatus: 409,
              expectedBody: {
                error: { code: 'EMA-1004', description: 'request already processed' },
              },
            },
          },
          {
            stepName: 'Order keeps its terminal status after the rejected re-purchase',
            action: 'checkout.vault.assertTransactionPaymentStatus',
            params: { status: 'processed' },
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
