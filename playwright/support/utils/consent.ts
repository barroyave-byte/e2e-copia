import { Page, Request, Response } from '@playwright/test';

export interface WaitForConsentOptions {
  orderToken?: string;
  orderId?: string;
  status?: string;
  timeout?: number;
}

/**
 * Resolves options object from string orderToken or options object.
 */
function parseConsentOptions(
  orderTokenOrOptions?: string | WaitForConsentOptions,
  options?: { timeout?: number }
): WaitForConsentOptions {
  if (typeof orderTokenOrOptions === 'string') {
    return { orderToken: orderTokenOrOptions, ...options };
  }
  return { ...orderTokenOrOptions, ...options };
}

/**
 * Checks if a URL belongs to the consent endpoint, matching the optional orderToken.
 */
function isConsentUrl(url: string, orderToken?: string): boolean {
  if (orderToken) {
    return url.includes(`/merchants/orders/${orderToken}/consent`);
  }
  return url.includes('/merchants/orders/') && url.includes('/consent');
}

/**
 * Waits for the consent polling HTTP request for the given order.
 */
export function waitForConsentRequest(
  page: Page,
  orderTokenOrOptions?: string | WaitForConsentOptions,
  options?: { timeout?: number }
): Promise<Request> {
  const opts = parseConsentOptions(orderTokenOrOptions, options);

  return page.waitForRequest(
    (request) => isConsentUrl(request.url(), opts.orderToken) && request.method() === 'GET',
    { timeout: opts.timeout }
  );
}

/**
 * Waits for the consent HTTP response, optionally validating status, orderToken, or orderId.
 */
export function waitForConsentResponse(
  page: Page,
  orderTokenOrOptions?: string | WaitForConsentOptions,
  options?: { timeout?: number }
): Promise<Response> {
  const opts = parseConsentOptions(orderTokenOrOptions, options);

  return page.waitForResponse(
    async (response) => {
      if (!isConsentUrl(response.url(), opts.orderToken) || response.request().method() !== 'GET') {
        return false;
      }

      if (opts.status || opts.orderId || opts.orderToken) {
        try {
          const json = await response.json();
          if (opts.status && json?.data?.consent?.status !== opts.status) {
            return false;
          }
          if (
            opts.orderToken &&
            json?.data?.order?.order_token &&
            json.data.order.order_token !== opts.orderToken
          ) {
            return false;
          }
          if (
            opts.orderId &&
            json?.data?.order?.transaction_id &&
            json.data.order.transaction_id !== opts.orderId
          ) {
            return false;
          }
        } catch {
          return false;
        }
      }

      return true;
    },
    { timeout: opts.timeout }
  );
}
