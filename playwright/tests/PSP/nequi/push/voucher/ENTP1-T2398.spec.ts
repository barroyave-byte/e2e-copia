import { test } from '@support/fixtures';
import { NequiPushPaymentFlowUntilPhoneVerification } from '../share/nequiPushPaymentFlowUntilPhoneVerification';
import { NequiMockingStrategy, NequiTestAssertions } from '../share/nequiMockingStrategy';

const nequiPushPaymentFlowUntilPhoneVerification = new NequiPushPaymentFlowUntilPhoneVerification();

test.describe(
  '@regression Invalid phone number format with NequiPush',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiPushPaymentFlowUntilPhoneVerification.globalSetup();
    nequiPushPaymentFlowUntilPhoneVerification.testSetup();

    test(
      '@ENTP1-T2398 Invalid phone number format error (NequiPush)',
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
            interceptors: NequiMockingStrategy.getCommonInterceptors().invalidPhoneFormat,
          },
        });

        await test.step('Validate invalid phone format error and iframe remains visible', async () => {
          await NequiTestAssertions.assertErrorHandling(
            page,
            nequiPushFormPage,
            'INVALID_PHONE_FORMAT'
          );
        });
      }
    );
  }
);
