import { Page } from '@playwright/test';
import { buildPurchaseSuccessResponse } from './walletPurchaseResponse';

interface WalletProcessorEntry {
  processor_name: 'apple_pay' | 'google_pay';
  payment_method: 'wallet';
  credentials: Record<string, unknown>;
  extra_params: Record<string, unknown>;
  enabled: true;
  id?: string;
  method_type: 'wallet';
}

const APPLE_PAY_ENTRY: WalletProcessorEntry = {
  processor_name: 'apple_pay',
  payment_method: 'wallet',
  method_type: 'wallet',
  enabled: true,
  credentials: {
    merchantIdentifier: 'merchant.com.deuna.mock',
    displayName: 'DEUNA Mock',
  },
  extra_params: {
    countryCode: 'MX',
    currencyCode: 'MXN',
    supportedNetworks: ['visa', 'masterCard', 'amex'],
    merchantCapabilities: ['supports3DS'],
  },
};

const GOOGLE_PAY_ENTRY: WalletProcessorEntry = {
  processor_name: 'google_pay',
  payment_method: 'wallet',
  method_type: 'wallet',
  enabled: true,
  credentials: {
    gateway: 'mock_gateway',
    gatewayMerchantId: 'mock_merchant',
  },
  extra_params: {
    merchantId: 'GPAY_MOCK_MERCHANT',
    merchantName: 'DEUNA Mock',
    tokenizationType: 'PAYMENT_GATEWAY',
    allowedCardNetworks: ['VISA', 'MASTERCARD'],
    allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  },
};

interface WalletMockOptions {
  enableApplePay?: boolean;
  enableGooglePay?: boolean;
}

/**
 * Routes the network endpoints involved in the CDN-wallet flow so the iframe
 * surfaces Apple Pay / Google Pay tabs and the Apple Pay merchant-validation
 * call resolves without hitting real infrastructure.
 *
 * - `applepay.cdn-apple.com/.../apple-pay-sdk.js` → empty 200 (prevents the
 *   real Apple JS SDK from polyfilling `window.ApplePaySession` and clobbering
 *   our mock; the SDK still resolves `script.onload` and proceeds)
 * - `pay.google.com/gp/p/js/pay.js` → empty 200 (same reason for Google Pay)
 * - `wallet/credentials/{id}/payment-session` → returns a fake merchant session
 *   for the Apple Pay `onvalidatemerchant` flow
 * - `available-payment-options` → injects wallet processors into the response
 * - `merchants/transactions/purchase` → returns a canned 200 success body so
 *   the iframe completes the flow regardless of whether the merchant has the
 *   wallet processor linked in the backend (works against any environment —
 *   the route matches by path only, no host)
 */
export const installWalletNetworkMocks = async (
  page: Page,
  { enableApplePay = false, enableGooglePay = false }: WalletMockOptions = {}
): Promise<void> => {
  if (enableApplePay) {
    await page.route(/applepay\.cdn-apple\.com\/.*apple-pay-sdk\.js/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );
  }

  if (enableGooglePay) {
    await page.route(/pay\.google\.com\/gp\/p\/js\/pay\.js/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );
  }

  await page.route(/\/wallet\/credentials\/.+\/payment-session/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          merchantSessionIdentifier: 'mock-session-id',
          nonce: 'mock-nonce',
          merchantIdentifier: 'merchant.com.deuna.mock',
          domainName: 'localhost',
          displayName: 'DEUNA Mock',
          signature: 'mock-signature',
        },
      }),
    });
  });

  await page.route(/\/orders\/.+\/payment-options|\/available-payment-options/, async (route) => {
    const response = await route.fetch().catch(() => null);
    let body: any = { available_payment_options: [] };

    if (response) {
      try {
        body = await response.json();
      } catch {
        body = { available_payment_options: [] };
      }
    }

    body.available_payment_options = body.available_payment_options ?? [];

    if (enableApplePay) {
      body.available_payment_options.push({
        payment_method: 'wallet',
        processors: [{ processor_name: 'apple_pay', credentials: APPLE_PAY_ENTRY.credentials, extra_params: APPLE_PAY_ENTRY.extra_params }],
      });
    }
    if (enableGooglePay) {
      body.available_payment_options.push({
        payment_method: 'wallet',
        processors: [{ processor_name: 'google_pay', credentials: GOOGLE_PAY_ENTRY.credentials, extra_params: GOOGLE_PAY_ENTRY.extra_params }],
      });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  if (enableApplePay || enableGooglePay) {
    await page.route(/\/merchants\/transactions\/purchase(\?|$)/, async (route) => {
      let requestBody: Record<string, unknown> = {};
      try {
        requestBody = JSON.parse(route.request().postData() ?? '{}');
      } catch {
        requestBody = {};
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildPurchaseSuccessResponse(requestBody)),
      });
    });
  }
};
