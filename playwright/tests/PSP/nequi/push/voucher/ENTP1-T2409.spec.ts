import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Currency not supported error with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2409 Currency not supported - non COP (NequiPush)',
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
        await test.step('Validate currency not supported error handling', async () => {
          await nequiTestSuite.runErrorScenario(
            page,
            'currencyNotSupported',
            'CURRENCY_NOT_SUPPORTED'
          );
        });
      }
    );
  }
);
