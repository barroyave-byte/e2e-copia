/**
 * Init-script body that injects a fake `window.ApplePaySession` so deuna-web-sdk's
 * Apple Pay code paths execute against a deterministic, scriptable fake browser
 * environment. Used by Playwright tests via `page.addInitScript` — runs in every
 * frame the page creates (parent + same/cross-origin iframes).
 *
 * The fake exposes `window.__deunaApplePayTrigger.authorize()` so the test can
 * advance the session past `onpaymentauthorized` synchronously after a click.
 */
export const applePaySessionMockScript = (): string => `
(() => {
  if (window.ApplePaySession) return;

  const merchantSession = { merchantSessionIdentifier: 'mock-session-id' };

  class ApplePaySessionMock {
    static STATUS_SUCCESS = 0;
    static STATUS_FAILURE = 1;

    onvalidatemerchant = null;
    onpaymentauthorized = null;
    oncancel = null;

    constructor(version, paymentRequest) {
      this.version = version;
      this.paymentRequest = paymentRequest;
    }

    static supportsVersion() { return true; }
    static canMakePayments() { return true; }
    static canMakePaymentsWithActiveCard() { return Promise.resolve(true); }
    static applePayCapabilities() {
      return Promise.resolve({ paymentCredentialStatus: 'paymentCredentialsAvailable' });
    }

    __authorize() {
      if (this.__authorized) return Promise.resolve();
      this.__authorized = true;

      console.log('[ApplePayMock] __authorize: firing handlers', {
        hasValidate: typeof this.onvalidatemerchant === 'function',
        hasAuthorize: typeof this.onpaymentauthorized === 'function',
      });

      const validatePromise = (typeof this.onvalidatemerchant === 'function')
        ? Promise.resolve()
            .then(() => this.onvalidatemerchant({ validationURL: 'https://mock/apple-pay/validate' }))
            .catch((e) => console.error('[ApplePayMock] onvalidatemerchant threw:', e))
        : Promise.resolve();

      return validatePromise.then(() => {
        if (typeof this.onpaymentauthorized !== 'function') return;
        console.log('[ApplePayMock] firing onpaymentauthorized');
        return Promise.resolve()
          .then(() => this.onpaymentauthorized({
            payment: {
              token: {
                paymentData: { mock: true },
                paymentMethod: {
                  displayName: 'Mock Card',
                  network: 'Visa',
                  type: 'debit',
                },
                transactionIdentifier: 'mock-tx-id',
              },
            },
          }))
          .catch((e) => console.error('[ApplePayMock] onpaymentauthorized threw:', e));
      });
    }

    begin() {
      console.log('[ApplePayMock] begin() called');
      const self = this;
      // Manual trigger kept as an escape hatch for tests that want to
      // control timing or cancel mid-flow. Idempotent (guarded by __authorized).
      window.__deunaApplePayTrigger = {
        authorize: () => self.__authorize(),
        cancel: () => {
          if (typeof self.oncancel === 'function') self.oncancel();
        },
      };
      // Auto-complete on the next macrotask. setTimeout(0) is more reliable
      // than queueMicrotask across cross-frame boundaries — by then the SDK's
      // Promise(resolve => { ... session.begin(); }) constructor callback has
      // returned and all three handlers are attached to \`this\`.
      setTimeout(() => { self.__authorize(); }, 0);
    }

    completeMerchantValidation(_session) { /* noop */ }
    completePayment(_status) { /* noop */ }
    abort() {
      if (typeof this.oncancel === 'function') this.oncancel();
    }
  }

  window.ApplePaySession = ApplePaySessionMock;
  window.__deunaApplePaySessionMock = { merchantSession };

  // Apple's real CDN script registers <apple-pay-button> as a custom element
  // and provides its visual rendering. With the CDN blocked, the SDK's
  // \`document.createElement("apple-pay-button")\` would otherwise produce
  // an empty unknown element (invisible, no click target). Register our own
  // custom element so the button is visible and clickable, and inherits the
  // click handler the SDK attaches via addEventListener.
  if (typeof customElements !== 'undefined' && !customElements.get('apple-pay-button')) {
    class FakeApplePayButton extends HTMLElement {
      connectedCallback() {
        if (this.__initialized) return;
        this.__initialized = true;
        this.style.display = this.style.display || 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.style.width = this.style.width || '100%';
        this.style.height = this.style.height || '44px';
        this.style.backgroundColor = '#000';
        this.style.color = '#fff';
        this.style.borderRadius = '6px';
        this.style.cursor = 'pointer';
        this.style.fontFamily = '-apple-system, system-ui, sans-serif';
        this.style.fontSize = '16px';
        this.style.fontWeight = '500';
        this.setAttribute('data-testid', 'apple-pay-button');
        this.setAttribute('role', 'button');
        this.innerText = 'Pay (Mock)';
      }
    }
    customElements.define('apple-pay-button', FakeApplePayButton);
  }
})();
`;
