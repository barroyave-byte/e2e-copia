import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Merchant not enabled for Nequi',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2408 Merchant not enabled for Nequi (NequiPush)',
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
        await test.step('Validate merchant not enabled error handling', async () => {
          await nequiTestSuite.runErrorScenario(page, 'merchantNotEnabled', 'MERCHANT_NOT_ENABLED');
        });
      }
    );
  }
);
