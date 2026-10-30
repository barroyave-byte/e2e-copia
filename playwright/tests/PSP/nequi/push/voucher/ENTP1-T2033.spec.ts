import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Simulating payment success with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2033 Simulating payment success (NequiPush)',
      {
        tag: [
          '@payments_integration',
          '@smoke_gmv',
          '@team_payment_integration',
          '@preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        await test.step('Validating verify response and hide iframe', async () => {
          await nequiTestSuite.runSuccessScenario(page);
        });
      }
    );
  }
);
