import { test } from '@support/fixtures';
import { NequiPushPaymentFlowUntilPhoneVerification } from '../share/nequiPushPaymentFlowUntilPhoneVerification';

const nequiPushPaymentFlowUntilPhoneVerification = new NequiPushPaymentFlowUntilPhoneVerification();

test.describe(
  '@regression Timeout error during phone verification with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiPushPaymentFlowUntilPhoneVerification.globalSetup();
    nequiPushPaymentFlowUntilPhoneVerification.testSetup();

    test(
      '@ENTP1-T2401 Timeout error during phone verification (NequiPush)',
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
        const { nequiPushFormPage } = await nequiPushPaymentFlowUntilPhoneVerification.run({
          page,
          options: {
            interceptors: {
              verify: {
                body: {
                  data: null,
                  error: {
                    code: 'TIMEOUT_ERROR',
                    message: 'Tiempo de espera agotado. Intenta nuevamente.',
                  },
                  errorException: {},
                },
              },
            },
          },
        });

        await test.step('Validate timeout error handling and iframe remains visible', async () => {
          await page.waitForTimeout(2000);
          await nequiPushFormPage.assertPaymentEmbedDivHasChildren();
        });
      }
    );
  }
);
