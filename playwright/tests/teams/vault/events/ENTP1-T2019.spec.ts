import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { UserAuthenticatedBySmsChannelAndPaymentFlow } from '../share/userAuthenticatedBySmsChannelAndPaymentFlow';

const flow = new UserAuthenticatedBySmsChannelAndPaymentFlow({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario authenticado con otp expirado en SMS channel',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T2019 [Eventos]: Payment Vault Usuarios Existente con canal SMS, código valido y flujo autenticado',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
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
