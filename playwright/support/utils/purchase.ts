import { Page, Response } from '@playwright/test';

export interface WaitForPurchaseResponseOptions {
  urlPattern?: string | RegExp;
  timeout?: number;
}

export const PURCHASE_URL_PATTERN =
  /\/(transactions|v2\/merchants\/orders)\/purchase/;

export function waitForPurchaseResponse(
  page: Page,
  {
    urlPattern = PURCHASE_URL_PATTERN,
    timeout = 60_000,
  }: WaitForPurchaseResponseOptions = {}
): Promise<Response> {
  if (typeof urlPattern === 'string') {
    return page.waitForResponse(urlPattern, { timeout });
  }

  return page.waitForResponse(
    (response) => {
      const matches = urlPattern.test(response.url());
      return matches && response.request().method() === 'POST';
    },
    { timeout }
  );
}
