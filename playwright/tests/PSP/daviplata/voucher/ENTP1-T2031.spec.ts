import { test } from '@support/fixtures';
import { DaviplataPaymentFlowUntilOTP } from './share/daviplataPaymentFlowUntilOtp';

const daviplataPaymentFlowUntilOtp = new DaviplataPaymentFlowUntilOTP();

test.describe(
  '@regression Validate redirection to OTP page in Daviplata payment flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    daviplataPaymentFlowUntilOtp.globalSetup();
    daviplataPaymentFlowUntilOtp.testSetup();

    test(
      '@ENTP1-T2031 Redirection to OTP Page (Daviplata)',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
      },
      async ({ page }) => {
        await daviplataPaymentFlowUntilOtp.run({ page });
      }
    );
  }
);
