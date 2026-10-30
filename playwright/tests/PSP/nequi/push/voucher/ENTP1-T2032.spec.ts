import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Simulating payment error with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2032 Simulating payment error (NequiPush)',
      {
        tag: [
          '@payments_integration',
          '@smoke_gmv',
          '@preprod',
          '@checkout_ui',
          '@team_payment_integration',
        ],
      },
      async ({ page }) => {
        await test.step('Simulate error verify response and does not hidden iframe', async () => {
          // Using custom error to maintain backward compatibility with existing E2E error code
          await nequiTestSuite.runCustomErrorScenario(page, 'E2E', 'Error de prueba E2E');
        });
      }
    );
  }
);
