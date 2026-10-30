import { CommonsActions } from '@pages/commonActions';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { expect, Frame, FrameLocator, Locator, Page } from '@playwright/test';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { PURCHASE_URL_PATTERN } from '@support/utils/purchase-contracts';
import {
  waitForConsentRequest,
  waitForConsentResponse,
  WaitForConsentOptions,
} from '@support/utils/consent';

export interface InterceptorRequest {
  body?: {
    order?: any;
    data?: any;
    error?: any;
    errorException?: any;
  };
  status?: number;
}

export interface ClickOnPayParams {
  interceptorRequest: InterceptorRequest;
}

export class FormHelpers extends CommonsActions {
  page: Page;
  purchaseResponse: any;
  iframePaymentWidget: FrameLocator;
  iframeElements: FrameLocator;
  buttonCancel: Locator;
  buttonPay: Locator;
  divPaymentEmbed: Locator;
  frame: Locator;
  containerHeight = 0;

  constructor(page: Page) {
    super(page);
    this.page = page;
    const paymentWidget = new PaymentDeunaNowPage(page);
    this.iframePaymentWidget = paymentWidget.getIframe();
    this.iframeElements = paymentWidget.getElementsIframe();
    this.buttonCancel = page.locator('text="Cancelar"');
    this.buttonPay = page.locator('button:has-text("Pagar")');
    this.divPaymentEmbed = page.locator('#payment-embed > *');
  }

  async scrollIntoPaymentEmbedIframe() {
    await this.divPaymentEmbed.first().scrollIntoViewIfNeeded();
  }

  iframeLocator(element: Locator) {
    return this.iframePaymentWidget.locator(element);
  }

  async cancel() {
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonCancel));
  }

  waitingPurchaseResponse() {
    this.purchaseResponse = waitForPurchaseResponse(this.page, { timeout: 60000 });
  }

  async interceptPurchaseResponse(interceptorRequest: InterceptorRequest) {
    await this.page.route(PURCHASE_URL_PATTERN, async (route) => {
      return route.fulfill({
        status: interceptorRequest.status,
        contentType: 'application/json',
        body: JSON.stringify(interceptorRequest.body),
      });
    });
  }

  async clickOnPay(params?: ClickOnPayParams) {
    if (params?.interceptorRequest) {
      this.interceptPurchaseResponse(params.interceptorRequest);
    }

    this.waitingPurchaseResponse();
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonPay));
  }

  async assertSuccessPurchaseResponse() {
    const purchaseResponse = await this.purchaseResponse;
    const status = await purchaseResponse.status();
    expect(status).toEqual(200);
  }

  async assertWaitingOTPPurchaseResponse() {
    const purchaseResponse = await this.purchaseResponse;
    const { order } = await purchaseResponse.json();
    expect(order).toBeTruthy();

    expect(order.status).toBe('pending');
    const paymentData = order.payment.data;
    expect(paymentData.metadata.status).toBe('waiting OTP');
    expect(paymentData.processor).toBe('daviplata');
  }

  async assertDivHasChildren(divElement: Locator) {
    await expect(divElement).not.toHaveCount(0);
  }

  async assertDivHasNoChildren(divElement: Locator) {
    await expect(divElement).toHaveCount(0);
  }

  async assertPaymentEmbedDivHasChildren() {
    await this.assertDivHasChildren(this.divPaymentEmbed);
  }

  async assertPaymentEmbedDivHasNoChildren() {
    await this.assertDivHasNoChildren(this.divPaymentEmbed);
  }

  async assertIframeClosed() {
    const iframeLocator = this.page.locator('iframe.zoid-visible');
    await expect(iframeLocator).toBeHidden();
  }

  /** Waits for the consent polling request for the given order. */
  waitForConsentRequest(
    orderTokenOrOptions?: string | WaitForConsentOptions,
    options?: { timeout?: number }
  ) {
    return waitForConsentRequest(this.page, orderTokenOrOptions, options);
  }

  /** Waits for the consent polling response for the given order. */
  waitForConsentResponse(
    orderTokenOrOptions?: string | WaitForConsentOptions,
    options?: { timeout?: number }
  ) {
    return waitForConsentResponse(this.page, orderTokenOrOptions, options);
  }

  async getElementHeight(locator: Locator): Promise<number> {
    const heightString = await locator.evaluate((el) => window.getComputedStyle(el).height);
    return parseInt(heightString.replace('px', ''), 10);
  }

  async assertContainerResized(locator: Locator, label = 'container'): Promise<void> {
    await expect(locator).toBeVisible();
    const prevHeight = this.containerHeight;
    await expect
      .poll(() => this.getElementHeight(locator), {
        message: `${label} height stayed at ${prevHeight}px`,
      })
      .not.toBe(prevHeight);
    this.containerHeight = await this.getElementHeight(locator);
  }
}
