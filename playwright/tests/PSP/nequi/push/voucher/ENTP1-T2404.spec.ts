import { test } from '@support/fixtures';
import { NequiPushPaymentFlowUntilPhoneVerification } from '../share/nequiPushPaymentFlowUntilPhoneVerification';

const nequiPushPaymentFlowUntilPhoneVerification = new NequiPushPaymentFlowUntilPhoneVerification();

test.describe(
  '@regression Insufficient funds error with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiPushPaymentFlowUntilPhoneVerification.globalSetup();
    nequiPushPaymentFlowUntilPhoneVerification.testSetup();

    test(
      '@ENTP1-T2404 Insufficient funds in Nequi account (NequiPush)',
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
                    code: 'INSUFFICIENT_FUNDS',
                    message: 'Fondos insuficientes en tu cuenta Nequi',
                  },
                  errorException: {},
                },
              },
            },
          },
        });

        await test.step('Validate insufficient funds error and iframe remains visible', async () => {
          await page.waitForTimeout(2000);
          await nequiPushFormPage.assertPaymentEmbedDivHasChildren();
        });
      }
    );
  }
);
