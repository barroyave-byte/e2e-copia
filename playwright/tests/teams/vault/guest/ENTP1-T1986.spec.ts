import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { UnregisteredUserPaymentWithInstallments } from '../share/unregisteredUserPaymentWithInstallments';

const flow = new UnregisteredUserPaymentWithInstallments({ interactionType: 'fill' });

test.describe(
  '@regression Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    flow.globalSetup();

    test(
      '@ENTP1-T1986 Compra Exitosa de Usuario Nuevo: con tarjeta nueva e installments usando el Vault Widget',
      { tag: ['@smoke', '@installments', '@remove_preprod', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({ step: [...flow.flowSteps()] });
      }
    );
  }
);
