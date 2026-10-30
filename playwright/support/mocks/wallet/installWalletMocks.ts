import { Page } from '@playwright/test';
import { applePaySessionMockScript } from './applePaySessionMock';
import { googlePayClientMockScript } from './googlePayClientMock';
import { installWalletNetworkMocks } from './walletNetworkMocks';

export type WalletKind = 'apple_pay' | 'google_pay';

interface InstallWalletMocksOptions {
  wallets: WalletKind[];
}

/**
 * Installs the full mock surface needed to drive the Payment Widget's
 * CDN-wallet flow (Apple Pay / Google Pay) without real browser APIs or
 * real wallet network endpoints.
 *
 * Must be called BEFORE the page navigates — `addInitScript` only applies
 * to documents created after registration. Safe to call multiple times in
 * a single test (script body is guarded by an idempotency check).
 */
export const installWalletMocks = async (
  page: Page,
  { wallets }: InstallWalletMocksOptions
): Promise<void> => {
  if (wallets.includes('apple_pay')) {
    await page.addInitScript({ content: applePaySessionMockScript() });
  }
  if (wallets.includes('google_pay')) {
    await page.addInitScript({ content: googlePayClientMockScript() });
  }

  await installWalletNetworkMocks(page, {
    enableApplePay: wallets.includes('apple_pay'),
    enableGooglePay: wallets.includes('google_pay'),
  });
};
