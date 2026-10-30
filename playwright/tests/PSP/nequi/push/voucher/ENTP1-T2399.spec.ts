import { test } from '@support/fixtures';
import { NequiPushPaymentFlowUntilPhoneVerification } from '../share/nequiPushPaymentFlowUntilPhoneVerification';

const nequiPushPaymentFlowUntilPhoneVerification = new NequiPushPaymentFlowUntilPhoneVerification();

test.describe(
  '@regression Empty phone number with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiPushPaymentFlowUntilPhoneVerification.globalSetup();
    nequiPushPaymentFlowUntilPhoneVerification.testSetup();

    test(
      '@ENTP1-T2399 Empty phone number validation error (NequiPush)',
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
                    code: 'PHONE_REQUIRED',
                    message: 'El número de teléfono es requerido',
                  },
                  errorException: {},
                },
              },
            },
          },
        });

        await test.step('Validate empty phone number error and iframe remains visible', async () => {
          await page.waitForTimeout(2000);
          await nequiPushFormPage.assertPaymentEmbedDivHasChildren();
        });
      }
    );
  }
);
