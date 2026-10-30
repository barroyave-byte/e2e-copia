import { test } from '@deuna/test';
import { NequiPushPaymentFlowUntilPhoneVerification } from '../share/nequiPushPaymentFlowUntilPhoneVerification';
import { NequiMockingStrategy, NequiTestAssertions } from '../share/nequiMockingStrategy';

const nequiPushPaymentFlowUntilPhoneVerification = new NequiPushPaymentFlowUntilPhoneVerification();

test.describe(
  '@regression Nequipush with CustomStyle',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    nequiPushPaymentFlowUntilPhoneVerification.globalSetup();
    nequiPushPaymentFlowUntilPhoneVerification.testSetup();

    test(
      '@ENTP1-T2106 Verify CustomStyle (NequiPush)',
      {
        tag: [
          '@preprod',
          '@checkout_ui',
          '@payments_integration',
          '@team_payment_integration',
          '@custom_style',
        ],
      },
      async ({ page }) => {
        const { nequiPushFormPage } = await nequiPushPaymentFlowUntilPhoneVerification.run({
          page,
          options: {
            interceptors: NequiMockingStrategy.getCommonInterceptors().success,
            timesToVerify: 1,
          },
        });

        await test.step('Validate custom style and successful payment flow', async () => {
          await NequiTestAssertions.assertSuccessHandling(page, nequiPushFormPage);
        });
      }
    );
  }
);
