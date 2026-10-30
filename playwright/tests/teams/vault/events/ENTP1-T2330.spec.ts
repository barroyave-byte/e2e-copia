import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { GuestUserSeesTags } from '../share/guestUserPaymentFlow';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const flow = new GuestUserSeesTags({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario guest, seleccionando un installment y que continue el pago',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    /**
     * It should only be emitted twice, it is being emitted 4 times, the Checkout team will review it on the ticket:
     * https://deuna.atlassian.net/browse/ENTP1-17680
     */
    test(
      '@ENTP1-T2330 [Eventos]: Payment Vault - Validate tagShown Event Emission Only When Tags Are Visible',
      { tag: ['@smoke', '@installments', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'analytics.events.startCapture',
              stepName: 'Start capturing analytics events before navigation',
            },
            ...flow.flowSteps(),
            {
              action: 'analytics.events.verifyEventCount',
              params: {
                event: CheckoutEventsName.tagShown,
                expected: 2,
              },
              stepName: 'Validate tagShown was emitted exactly twice',
            },
          ],
        });
      }
    );
  }
);
