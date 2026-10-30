import { test } from '@support/fixtures';
import { ref, TestingFramework } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

// The incident's own merchant identifier, underscore included: the value that reached BAZ as
// `id = baz_japay_01` and was rejected.
const INCIDENT_STORE_CODE = 'baz_japay_01';

// The card sends the year as 2 digits, the way the merchants in the incident did. The 4-digit
// form is the platform's responsibility, and is what the assertion below demands.
const TWO_DIGIT_EXPIRY_YEAR = '30';
const EXPECTED_FOUR_DIGIT_EXPIRY_YEAR = '2030';

const bazProcessor = processorsConfig.bazProcessor_MX;

test.describe('@regression BAZ data sync — transaction payload format', () => {
  test(
    '@PLAT-T1625 Baz Kafka Payload Format',
    { tag: ['@team_platform', '@api', '@payments_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            stepName: 'Crear comercio estilo BAZ (GEM / Japay / XKNet)',
            params: { country: 'MX' },
          },
          {
            action: 'setup.processor.createProcessor',
            stepName: `Configurar payment processor con afiliación BAZ numérica (${bazProcessor.external_merchant_id})`,
            params: { processorConfig: bazProcessor },
            saveAs: 'processorId',
          },
          {
            action: 'setup.order.createOrder',
            stepName: `Crear la orden con el identificador del incidente (store_code ${INCIDENT_STORE_CODE})`,
            params: { country: 'MX', options: { store_code: INCIDENT_STORE_CODE } },
          },
          {
            action: 'api.payment.purchaseWithCreditCard',
            stepName: 'Pagar la orden con una tarjeta que envía el año en 2 dígitos',
            params: {
              creditCard: creditCardData.bazVisaCardSuccessful,
              processorName: bazProcessor.name,
              cardOverrides: { expiry_year: TWO_DIGIT_EXPIRY_YEAR },
            },
          },
          {
            action: 'api.payment.assertPurchaseStatus',
            stepName: 'La transacción se procesa y emite el evento de orden pagada',
            params: { expectedStatus: 200 },
          },
          {
            action: 'api.bazSync.assertTransactionPayload',
            stepName:
              'Validar afiliacion (numérica), anio (4 dígitos) y store_code contra las reglas de BAZ',
            params: {
              expectedAffiliationCode: bazProcessor.external_merchant_id,
              expectedExpiryYear: EXPECTED_FOUR_DIGIT_EXPIRY_YEAR,
              expectedStoreCode: INCIDENT_STORE_CODE,
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
