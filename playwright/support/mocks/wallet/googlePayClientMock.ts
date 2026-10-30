/**
 * Init-script body that injects a fake `window.google.payments.api.PaymentsClient`
 * so deuna-web-sdk's Google Pay code paths execute against a deterministic fake.
 * The CDN script load (https://pay.google.com/gp/p/js/pay.js) is short-circuited:
 * we install the client before the script tag fires, but the SDK currently waits
 * for the script `onload` event — so we also intercept the script element to
 * fire `onload` immediately.
 */
export const googlePayClientMockScript = (): string => `
(() => {
  if (window.google && window.google.payments && window.google.payments.api) return;

  const fakePaymentMethodData = {
    apiVersion: 2,
    apiVersionMinor: 0,
    paymentMethodData: {
      description: 'Mock Visa **** 1111',
      info: {
        cardDetails: '1111',
        cardNetwork: 'VISA',
        assuranceDetails: { accountVerified: true, cardHolderAuthenticated: true },
      },
      tokenizationData: {
        type: 'PAYMENT_GATEWAY',
        token: JSON.stringify({ id: 'tok_mock', signature: 'mock', protocolVersion: 'ECv2' }),
      },
      type: 'CARD',
    },
  };

  class PaymentsClientMock {
    constructor(config) { this.config = config; }
    isReadyToPay() { return Promise.resolve({ result: true }); }
    createButton(options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-testid', 'google-pay-button');
      button.setAttribute('aria-label', 'Pay with Google Pay');
      button.style.cssText = 'background:#000;color:#fff;border:none;border-radius:4px;padding:10px 16px;width:100%;cursor:pointer;';
      button.innerText = 'GPay (Mock)';
      if (options && typeof options.onClick === 'function') {
        button.addEventListener('click', options.onClick);
      }
      return button;
    }
    loadPaymentData(_request) { return Promise.resolve(fakePaymentMethodData); }
  }

  window.google = window.google || {};
  window.google.payments = window.google.payments || {};
  window.google.payments.api = { PaymentsClient: PaymentsClientMock };

  // Short-circuit the SDK script-load wait: when the SDK appends the
  // <script src="https://pay.google.com/gp/p/js/pay.js">, the real CDN
  // never reaches us in tests. We patch appendChild so the script fires
  // its onload event immediately when it's appended.
  const originalAppendChild = HTMLBodyElement.prototype.appendChild;
  HTMLBodyElement.prototype.appendChild = function (node) {
    const result = originalAppendChild.call(this, node);
    if (node && node.tagName === 'SCRIPT' && typeof node.src === 'string' && node.src.includes('pay.google.com/gp/p/js/pay.js')) {
      setTimeout(() => {
        if (typeof node.onload === 'function') node.onload(new Event('load'));
      }, 0);
    }
    return result;
  };

  window.__deunaGooglePayMock = { fakePaymentMethodData };
})();
`;
