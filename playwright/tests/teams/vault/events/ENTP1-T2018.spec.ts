import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { OTPRejectedGuestCheckoutCardSave } from '../share/otpRejectedGuestCheckoutCardSave';

const flow = new OTPRejectedGuestCheckoutCardSave({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario registrado, ingresando un OTP fallido y que continue como guest en Payment Vault',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T2018 Validate Event Flow for OTP Rejection and Guest Checkout Process',
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
              params: { expected: flow.sequenceEvents(), timeout: 10000 },
              stepName: 'Validate event sequence captured via postMessage',
            },
          ],
        });
      }
    );
  }
);
