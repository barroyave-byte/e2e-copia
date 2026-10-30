import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { BizumPushFormPage } from '@pages/explore/forms/bizumPushFormPage';
import { BizumPushVoucherPage } from '@pages/voucher/bizumPushVoucherPage';
import { verifyIframeBodyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

type ViewportSetKey = keyof typeof commonViewportSets;

interface InterceptorRequest {
  status: number;
  body: any;
}

export class PluginCheckoutWalletBizum extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.bizum';

  bizumFormPage!: BizumPushFormPage;
  bizumVoucherPage!: BizumPushVoucherPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.bizumFormPage = new BizumPushFormPage(context.page);
    this.bizumVoucherPage = new BizumPushVoucherPage(context.page);
  }

  /** @description Waits until the Bizum phone number input is visible, indicating the page has loaded. */
  async $tf_waitUntilLoadPage() {
    await this.bizumFormPage.waitUntilLoadPage();
  }

  /** @description Clicks the Bizum payment method tab in the checkout form. */
  async $tf_selectBizumTab() {
    await this.bizumFormPage.selectBizumTab();
  }

  /** @description Fills the phone number input in the Bizum push form and verifies the value. */
  async $tf_fillPhoneNumber(params?: { phone?: string }) {
    await this.bizumFormPage.fillPhoneNumber(params?.phone);
  }

  /** @description Clicks the Pay button on the Bizum form to trigger the purchase. */
  async $tf_clickPay() {
    await this.bizumFormPage.clickPay();
  }

  /** @description Clicks the Pay button and waits for the purchase response to complete. */
  async $tf_clickPayAndCapturePurchaseResponse() {
    await this.bizumFormPage.clickPayAndCapturePurchaseResponse();
  }

  /** @description Asserts that the purchase response was successful and status is pending. */
  async $tf_assertPurchasePendingResponse() {
    await this.bizumFormPage.assertPurchasePendingResponse();
  }

  // Voucher actions
  /** @description Asserts that the Bizum voucher title, description, reference title, and countdown are visible. */
  async $tf_assertBizumVoucher() {
    await this.bizumVoucherPage.assertBizumVoucher();
  }

  /** @description Asserts that the Bizum voucher active countdown text is visible. */
  async $tf_assertBizumVoucherCountdown() {
    await this.bizumVoucherPage.assertBizumVoucherCountdown();
  }

  /** @description Clicks the copy reference button in the Bizum voucher. */
  async $tf_clickCopyReference() {
    await this.bizumVoucherPage.clickOnCopyReference();
  }

  /** @description Clicks the cancel button and confirms the cancellation in the Bizum voucher dialog. */
  async $tf_clickCancel() {
    await this.bizumVoucherPage.clickOnCancel();
  }

  /** @description Asserts that the download reference button is present and then becomes hidden after interaction. */
  async $tf_assertDownloadReferenceButton() {
    await this.bizumVoucherPage.assertDownloadReferenceButton();
  }

  /** @description Asserts that the Bizum voucher expiration text is visible (waits up to 2 minutes). */
  async $tf_assertBizumVoucherExpirationText() {
    await this.bizumVoucherPage.assertBizumVoucherExpirationText();
  }

  /** @description Asserts that the validation error message is visible for the phone input in Haruka. */
  async $tf_assertPhoneError() {
    const errorMessage = this.bizumFormPage.iframePaymentWidget.locator('#phone-error');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  }

  /** @description Captures a visual snapshot of the Bizum phone input form across the specified viewport set. */
  async $tf_verifyFormVisualConsistency(params: {
    snapshotName: string;
    viewports?: ViewportSetKey;
  }) {
    await verifyIframeBodyVisualConsistency({
      page: this.context.page,
      frameLocator: this.bizumFormPage.iframePaymentWidget,
      snapshotName: params.snapshotName,
      viewports: commonViewportSets[params.viewports ?? 'desktopOnly'],
    });
  }

  /** @description Captures a visual snapshot of the Bizum voucher / reference page with dynamic masks applied. */
  async $tf_verifyVoucherVisualConsistency(params: {
    snapshotName: string;
    viewports?: ViewportSetKey;
  }) {
    await verifyIframeBodyVisualConsistency({
      page: this.context.page,
      frameLocator: this.bizumVoucherPage.iframeZoidVisible,
      snapshotName: params.snapshotName,
      viewports: commonViewportSets[params.viewports ?? 'desktopOnly'],
      options: {
        maskLocators: this.bizumVoucherPage.getVisualMaskLocators(),
      },
    });
  }
}
