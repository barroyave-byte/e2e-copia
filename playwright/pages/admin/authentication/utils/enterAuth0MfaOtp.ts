import { Page } from '@playwright/test';
import { AUTH0_LOCATORS } from '../constants';

export async function enterAuth0MfaOtp(page: Page, otpCode: string) {
  const otpInput = page.locator(AUTH0_LOCATORS.MFA_CHALLENGE.OTP_INPUT).first();
  await otpInput.waitFor({ state: 'visible', timeout: 10_000 });
  await otpInput.fill(otpCode);
}
