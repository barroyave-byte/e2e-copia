import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Account blocked error with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2405 Nequi account blocked/suspended (NequiPush)',
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
        await test.step('Validate account blocked error handling', async () => {
          await nequiTestSuite.runErrorScenario(page, 'accountBlocked', 'ACCOUNT_BLOCKED');
        });
      }
    );
  }
);
