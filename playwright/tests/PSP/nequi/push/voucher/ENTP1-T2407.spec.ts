import { test } from '@support/fixtures';
import { NequiTestSuite } from '../share/nequiTestSuite';

const nequiTestSuite = new NequiTestSuite();

test.describe(
  '@regression Processor not configured error with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiTestSuite.setupGlobal();
    nequiTestSuite.setupTest();

    test(
      '@ENTP1-T2407 Nequi processor not configured correctly (NequiPush)',
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
        await test.step('Validate processor configuration error handling', async () => {
          await nequiTestSuite.runErrorScenario(
            page,
            'processorNotConfigured',
            'PROCESSOR_NOT_CONFIGURED'
          );
        });
      }
    );
  }
);
