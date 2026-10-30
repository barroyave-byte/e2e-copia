import { Page, expect } from '@playwright/test';

interface NextDataPaymentMethods {
  paymentMethods: unknown[];
}

/**
 * Searches all frames in the page for `window.__NEXT_DATA__` and validates
 * that `paymentMethods` is not empty.
 *
 * Call this right after the widget iframe becomes visible to fail fast
 * with clear evidence when the backend did not return payment methods.
 *
 * @param page  Playwright Page that contains the widget
 * @param options.timeout  Max ms to wait for __NEXT_DATA__ across frames (default 30 000)
 */
export async function assertWidgetPaymentMethodsLoaded(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30_000 } = options;

  const pollInterval = 1_000;
  const maxAttempts = Math.ceil(timeout / pollInterval);
  let nextData: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const frame of page.frames()) {
      try {
        const data = await frame.evaluate(() => (window as any).__NEXT_DATA__);
        if (data?.props?.pageProps?.checkout) {
          nextData = data;
          break;
        }
      } catch {
        // frame may be detached or cross-origin, skip
      }
    }

    if (nextData) break;

    await page.waitForTimeout(pollInterval);
  }

  expect(
    nextData,
    'window.__NEXT_DATA__ with checkout data was not found in any frame'
  ).toBeTruthy();

  const checkout = nextData.props.pageProps.checkout as NextDataPaymentMethods;
  const paymentMethods = checkout?.paymentMethods;

  expect(
    Array.isArray(paymentMethods) && paymentMethods.length > 0,
    [
      'Backend did not return payment methods (paymentMethods is empty).',
      'This is a backend/environment issue, not a test bug.',
      '',
      `paymentMethods: ${JSON.stringify(paymentMethods)}`,
    ].join('\n')
  ).toBe(true);
}
