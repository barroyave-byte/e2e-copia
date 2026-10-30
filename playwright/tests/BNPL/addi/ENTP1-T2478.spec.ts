import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { AddiPaymentFlowUntilRedirect } from './share/addiPaymentFlowUntilRedirect';

const flow = new AddiPaymentFlowUntilRedirect();

test.describe('@regression Addi (Forms) | Mobile bridge bypasses AutoCloseCounter (no TIMEOUT purchaseError)', () => {
  flow.globalSetup();

  test(
    '@ENTP1-T2478 Addi (Forms) | Mobile bridge bypasses AutoCloseCounter (no TIMEOUT purchaseError)',
    { tag: ['@payment_widget', '@team_enterprise'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'analytics.events.startCapture',
            params: {
              skip: [
                'localizeFetchTranslationsError',
                'localizeMissingTranslationKey',
                'localizeMissingDefaultTranslationKey',
              ],
            },
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
});
