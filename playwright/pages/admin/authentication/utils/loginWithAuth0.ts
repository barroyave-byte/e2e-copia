import type { Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from '@support/adminCredentials';
import envConfig from '@support/envConfig';

import { detectAuth0LoginScreen } from './detectAuth0LoginScreen';
import { extractAuth0OtpSecret } from './extractAuth0OtpSecret';
import { AUTH0_LOGIN_SCREEN, AUTH0_LOCATORS } from '../constants';
import type { AdminCredentials, Auth0LoginScreen } from '../types';
import { generateOTPCode } from './generateOTPCode';
import { enterAuth0MfaOtp } from './enterAuth0MfaOtp';

export async function loginWithAuth0(
  page: Page,
  credentials: AdminCredentials = ADMIN_CREDENTIALS
) {
  await page.waitForSelector(AUTH0_LOCATORS.LOGIN_FORM.USERNAME_INPUT, { timeout: 15_000 });

  await page.locator(AUTH0_LOCATORS.LOGIN_FORM.USERNAME_INPUT).fill(credentials.email);
  await page.locator(AUTH0_LOCATORS.LOGIN_FORM.PASSWORD_INPUT).fill(credentials.password);
  await page.locator(AUTH0_LOCATORS.LOGIN_FORM.SUBMIT_BUTTON).click();

  let screenAfterLogin: Auth0LoginScreen = await detectAuth0LoginScreen(page);

  if (screenAfterLogin === AUTH0_LOGIN_SCREEN.ORG_PICKER) {
    console.log('Organization picker detected, selecting first organization');
    await page.locator(AUTH0_LOCATORS.ORG_PICKER.SUBMIT_BUTTON).first().click();
  }

  screenAfterLogin = await detectAuth0LoginScreen(page);

  if (screenAfterLogin === AUTH0_LOGIN_SCREEN.MFA_CHALLENGE) {
    const resolvedSecret = await extractAuth0OtpSecret(page);
    console.log('OTP secret read from enrollment page');

    const otpCode = generateOTPCode(resolvedSecret);
    console.log(`Generated TOTP code for MFA: ${otpCode}`);

    await enterAuth0MfaOtp(page, otpCode);

    await page.waitForTimeout(500);
    await page.locator(AUTH0_LOCATORS.MFA_CHALLENGE.CONTINUE_BUTTON).first().click();
  }

  await page.waitForURL(`${envConfig.ADMIN_URL}/orders`, { timeout: 30000 });
  console.log('Successfully authenticated via Auth0 with MFA');
}
