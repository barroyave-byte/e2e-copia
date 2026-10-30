import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { UserAuthenticatedByEmailChannelAndPaymentFlow } from '../share/userAuthenticatedByEmailChannelAndPaymentFlow';

const flow = new UserAuthenticatedByEmailChannelAndPaymentFlow({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario authenticado con otp expirado en Email channel',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T2026 [Eventos]: Payment Vault Usuarios Existente con canal Email - código valido y flujo autenticado',
      {
        tag: ['@smoke', '@team_enterprise'],
        annotation: { type: 'bug', description: 'ENTP1-16976' },
      },
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
