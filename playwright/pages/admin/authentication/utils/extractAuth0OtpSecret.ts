import type { Page } from '@playwright/test';
import { AUTH0_LOCATORS } from '../constants';

export async function extractAuth0OtpSecret(page: Page): Promise<string> {
  const troubleBtn = page.getByText(AUTH0_LOCATORS.OTP_ENROLLMENT.TROUBLE_SCANNING_TEXT);
  await troubleBtn.click();
  console.log('Clicked "Trouble Scanning?" to reveal manual secret');

  const copySecretBtn = page.getByText(AUTH0_LOCATORS.OTP_ENROLLMENT.COPY_CODE_TEXT);
  await copySecretBtn.waitFor({ state: 'visible', timeout: 10000 });

  const otpSecret = (
    await page.locator(AUTH0_LOCATORS.OTP_ENROLLMENT.SECRET_INPUT).first().textContent()
  ).trim();

  if (!otpSecret) {
    throw new Error('OTP secret element found but text content is empty');
  }

  console.log(`Extracted OTP secret from enrollment page (${otpSecret.length} chars)`);
  return otpSecret;
}
