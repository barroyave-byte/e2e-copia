import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { UnregisteredUserPaymentWithInstallments } from '../share/unregisteredUserPaymentWithInstallments';

const flow = new UnregisteredUserPaymentWithInstallments({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario guest, seleccionando un installment y que continue el pago',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T2014 [Eventos]: Payment Vault - Usuario nuevo con installments',
      { tag: ['@smoke', '@installments', '@team_enterprise', '@admin-preprod'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'analytics.events.startCapture',
              params: { skip: ['onBinDetected'] },
              stepName: 'Start capturing analytics events before navigation',
            },
            ...flow.flowSteps(),
            {
              action: 'analytics.events.verifySequence',
              params: { expected: flow.sequenceEvents() },
              stepName: 'Validate event sequence captured via postMessage',
            },
          ],
        });
      }
    );
  }
);
