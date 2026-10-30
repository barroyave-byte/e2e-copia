import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { UnregisteredUserPaymentWithInstallments } from '../share/unregisteredUserPaymentWithInstallments';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const flow = new UnregisteredUserPaymentWithInstallments({ interactionType: 'press' });

test.describe(
  '@regression Flujo de usuario guest, seleccionando un installment y que continue el pago',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T2041 [Eventos]: PaymentMethodsEntered con metadata correcta',
      { tag: ['@fixme_events_preprod', '@smoke', '@installments', '@team_enterprise'] },
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
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.paymentMethodsEntered,
                expected: {},
              },
              stepName: 'Validate paymentMethodsEntered event was emitted',
            },
          ],
        });
      }
    );
  }
);
