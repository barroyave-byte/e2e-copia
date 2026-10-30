import { test } from '@support/fixtures';
import { ref, TestingFramework } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

/**
 *
 * This spec covers one BAZ connection, one approved purchase (order A) and proof that the order
 * keeps the numeric affiliation and the real merchant_payment_processor_id, asserted with
 * api.bazSync.assertOrderAffiliation.
 *
 */

const bazProcessor = processorsConfig.bazProcessor_MX;

test.describe('@regression BAZ data sync — numeric affiliation on an approved order', () => {
  test(
    '@PI-T2208 Baz affiliation numeric and real merchant payment processor id',
    { tag: ['@team_payment_integration', '@api', '@payments_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            stepName: 'Crear comercio estilo BAZ en MX',
            params: { country: 'MX' },
          },
          {
            action: 'setup.processor.createProcessor',
            stepName: `Configurar payment processor BAZ con external_merchant_id numérico (${bazProcessor.external_merchant_id})`,
            params: { processorConfig: bazProcessor },
            saveAs: 'processorId',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenizar orden A (control: compra aprobada)',
            params: { country: 'MX' },
          },
          {
            action: 'api.payment.purchaseWithCreditCard',
            stepName: 'Ejecutar Purchase V2 de la orden A con tarjeta aprobada',
            params: {
              creditCard: creditCardData.bazVisaCardSuccessful,
              processorName: bazProcessor.name,
              transactionId: crypto.randomUUID(),
            },
          },
          { action: 'api.payment.assertPurchaseStatus', params: { expectedStatus: 200 } },
          {
            action: 'api.bazSync.assertOrderAffiliation',
            stepName: 'Validaciones de la orden A aprobada (control)',
            params: {
              expectedStatus: 'succeeded',
              expectedAffiliationCode: bazProcessor.external_merchant_id,
              expectedMerchantPaymentProcessorId: ref('processorId'),
            },
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
