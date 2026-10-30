import { test } from '@support/fixtures';
import { DaviplataPaymentFlowUntilOTP } from './share/daviplataPaymentFlowUntilOtp';

const daviplataPaymentFlowUntilOtp = new DaviplataPaymentFlowUntilOTP();

test.describe(
  '@regression Validate Daviplata payment widget handling of invalid OTP input without completing purchase',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    daviplataPaymentFlowUntilOtp.globalSetup();
    daviplataPaymentFlowUntilOtp.testSetup();

    test(
      '@ENTP1-T2030 Payment Widget(Daviplata)',
      {
        tag: ['@payments_integration', '@preprod', '@checkout_ui', '@team_payment_integration'],
      },
      async ({ page }) => {
        const { daviplataFormPage } = await daviplataPaymentFlowUntilOtp.run({ page });

        await test.step('Fill invalid OTP, click on Cancel to verify last step once again visible', async () => {
          await daviplataFormPage.assertPaymentEmbedDivHasChildren();
          await daviplataFormPage.enterOtpCode();
          await page.waitForTimeout(3000);
          await daviplataFormPage.cancel();
          await page.waitForTimeout(1000);
          await daviplataFormPage.assertDocumentNumbertoBeHidden();
        });
      }
    );
  }
);
