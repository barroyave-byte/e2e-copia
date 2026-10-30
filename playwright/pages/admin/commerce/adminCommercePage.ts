import { expect, type Download, Locator, Page, Response } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import pdfParse from 'pdf-parse';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@translations/getTranslations';
import {
  COMMERCE_DATA_TEST_IDS,
  CUSTOMER_NOTIFICATION_DATA_TEST_IDS,
  PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS,
} from './constants';
import { ORDER_DETAILS_DATA_TEST_IDS } from '@pages/admin/orders/constants';

export class AdminCommercePage {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  readonly paymentsConfigTab: Locator;
  readonly commerceInformationTab: Locator;
  readonly commerceEmailTab: Locator;
  readonly switchCommerceActivateManualReview: Locator;
  readonly switchCommerceActivateOpsAutoExecution: Locator;
  responsePromise: Promise<Response> | null = null;
  private voucherDownload: Download | null = null;
  private onVoucherDownload: ((download: Download) => void) | null = null;
  readonly switchShadowMode: Locator;
  readonly switchStateCode: Locator;
  readonly switchOrderFollowUp: Locator;
  readonly orderDetailsSummaryTab: Locator;
  readonly downloadVoucherButton: Locator;
  readonly resendVoucherButton: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.paymentsConfigTab = page.getByTestId(COMMERCE_DATA_TEST_IDS.tabPaymentsConfig);
    this.commerceInformationTab = page.getByTestId(COMMERCE_DATA_TEST_IDS.tabCommerceInformation);
    this.commerceEmailTab = page.getByTestId(COMMERCE_DATA_TEST_IDS.tabCommerceEmail);
    this.switchCommerceActivateManualReview = this.page.getByTestId(
      PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS.MANUAL_REVIEW
    );
    this.switchCommerceActivateOpsAutoExecution = this.page.getByTestId(
      PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS.AUTOMATIC_OPERATIONS
    );
    this.switchShadowMode = this.page.getByTestId(
      PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS.SHADOW_MODE
    );
    this.switchStateCode = this.page.getByTestId(
      PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS.STATE_CODE
    );
    this.switchOrderFollowUp = this.page.getByTestId(
      PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS.ORDER_FOLLOW_UP
    );
    this.orderDetailsSummaryTab = this.page.getByTestId(ORDER_DETAILS_DATA_TEST_IDS.tabSummary);
    this.downloadVoucherButton = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonDownloadVoucher
    );
    this.resendVoucherButton = this.page.getByTestId(
      ORDER_DETAILS_DATA_TEST_IDS.buttonResendVoucher
    );
  }

  async activateManualReview() {
    await this.selectPaymentsConfigTab();
    await this.clickAndWaitForProfileUpdate(this.switchCommerceActivateManualReview);
  }

  async activateOpsAutoExecution() {
    await this.selectPaymentsConfigTab();
    await this.clickAndWaitForProfileUpdate(this.switchCommerceActivateOpsAutoExecution);
  }

  async selectCommerceInformationTab() {
    await expect(this.commerceInformationTab).toBeVisible();
    await expect(this.commerceInformationTab).toBeEnabled();
    await this.commerceInformationTab.click();
  }
  async selectCommerceEmailTab() {
    await expect(this.commerceEmailTab).toBeVisible();
    await expect(this.commerceEmailTab).toBeEnabled();
    await this.commerceEmailTab.click();
  }
  async selectPaymentsConfigTab() {
    await expect(this.paymentsConfigTab).toBeVisible();
    await expect(this.paymentsConfigTab).toBeEnabled();
    await this.paymentsConfigTab.click();
  }
  async configurationVoucherRefund() {
    await this.checkNotificationOption(CUSTOMER_NOTIFICATION_DATA_TEST_IDS.refundsCheckbox);
    await this.saveEmailNotifications();
  }

  async configurationShadowMode() {
    await this.clickAndWaitForProfileUpdate(this.switchShadowMode);
  }

  async setShadowMode(enabled: boolean) {
    await expect(this.switchShadowMode).toBeVisible();
    const currentState = await this.switchShadowMode.getAttribute('aria-checked');

    if ((currentState === 'true') === enabled) {
      return;
    }

    await this.clickAndWaitForProfileUpdate(this.switchShadowMode);
    await expect(this.switchShadowMode).toHaveAttribute('aria-checked', enabled ? 'true' : 'false');
  }
  async configurationVoucherSuccessful() {
    await this.checkNotificationOption(
      CUSTOMER_NOTIFICATION_DATA_TEST_IDS.paymentSuccessfullyCheckbox
    );
    await this.saveEmailNotifications();
  }

  async configurationVoucher() {
    await this.checkNotificationOption(
      CUSTOMER_NOTIFICATION_DATA_TEST_IDS.termsAndConditionsCheckbox
    );
    await this.checkNotificationOption(CUSTOMER_NOTIFICATION_DATA_TEST_IDS.privacyPolicyCheckbox);

    const textInputTerms = this.page.getByTestId(
      CUSTOMER_NOTIFICATION_DATA_TEST_IDS.termsAndConditionsInput
    );
    const textInputsPolicies = this.page.getByTestId(
      CUSTOMER_NOTIFICATION_DATA_TEST_IDS.privacyPolicyInput
    );

    const url = 'https://www.deuna.com/';
    await textInputTerms.fill(url);
    await textInputsPolicies.fill(url);

    await expect(textInputTerms).toHaveValue(url);
    await expect(textInputsPolicies).toHaveValue(url);
    const saveButton = this.page.getByTestId(
      CUSTOMER_NOTIFICATION_DATA_TEST_IDS.saveAttachmentsButton
    );
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
  }

  async openOrderDetailsSummaryTab(): Promise<void> {
    await expect(
      this.orderDetailsSummaryTab,
      'The order details summary tab is not visible'
    ).toBeVisible({
      timeout: 40000,
    });
    await this.orderDetailsSummaryTab.click();
  }

  async resendVoucher() {
    await this.openOrderDetailsSummaryTab();
    await expect(this.resendVoucherButton, 'The resend voucher button is not visible').toBeVisible({
      timeout: 40000,
    });

    this.responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/vouchers') && response.request().method() === 'POST',
      { timeout: 60000 }
    );

    await this.resendVoucherButton.click();
    await this.page.locator('button[type="submit"]').click();
  }

  async downloadVoucher() {
    await this.openOrderDetailsSummaryTab();
    await expect(
      this.downloadVoucherButton,
      'The download voucher button is not visible'
    ).toBeVisible({
      timeout: 40000,
    });

    this.responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/vouchers?format=pdf') && response.request().method() === 'GET',
      { timeout: 60000 }
    );

    this.voucherDownload = null;
    this.onVoucherDownload = (download: Download) => {
      this.voucherDownload = download;
    };
    this.page.context().on('download', this.onVoucherDownload);
    await this.downloadVoucherButton.click();
  }

  async assertResend() {
    const responsePromise = this.responsePromise;
    expect(responsePromise, 'resend voucher response should be captured').not.toBeNull();
    if (!responsePromise) {
      throw new Error('resend voucher response was not captured');
    }
    const responsePurchase = await responsePromise;
    expect(responsePurchase.status(), 'resend status').toBe(200);
  }

  async assertDownloadVoucher(popup: Page | null, expectedPdfText?: RegExp): Promise<void> {
    const responsePromise = this.responsePromise;
    expect(responsePromise, 'download voucher response should be captured').not.toBeNull();
    if (!responsePromise) {
      throw new Error('download voucher response was not captured');
    }
    const responsePurchase = await responsePromise;
    expect(responsePurchase.status(), 'download status').toBe(200);
    expect(popup, 'A new page should be opened when clicking download voucher').not.toBeNull();
    if (!popup) {
      throw new Error('download voucher popup was not opened');
    }

    try {
      await expect
        .poll(() => this.voucherDownload?.url() ?? popup.url(), {
          message:
            'The voucher should be opened as a blob: URL (popup navigation in headed Chromium, download event in headless)',
        })
        .toContain('blob:');
    } finally {
      if (this.onVoucherDownload) {
        this.page.context().off('download', this.onVoucherDownload);
        this.onVoucherDownload = null;
      }
    }
    if (expectedPdfText) {
      let voucherBody = await responsePurchase.body();
      if (!voucherBody.length) {
        const voucherDownload = this.voucherDownload;
        expect(
          voucherDownload,
          'The voucher download should be captured in headless Chromium'
        ).not.toBeNull();
        if (!voucherDownload) {
          throw new Error('The voucher download was not captured');
        }
        voucherBody = await readFile(await voucherDownload.path());
      }
      // Uint8Array, not Buffer: see assertContentDownloadedPdfFile in referecePayModalPage.ts.
      const voucherPdf = await pdfParse(new Uint8Array(voucherBody));
      expect(voucherPdf.text, 'The voucher PDF should contain the expected email text').toMatch(
        expectedPdfText
      );
    }

    await popup.close();
  }

  private async checkNotificationOption(dataTestId: string) {
    const checkbox = this.page.getByTestId(dataTestId);
    await expect(checkbox).toBeVisible();

    if ((await checkbox.getAttribute('aria-checked')) !== 'true') {
      await checkbox.click();
      await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    }
  }

  private async saveEmailNotifications() {
    await this.page.getByTestId(CUSTOMER_NOTIFICATION_DATA_TEST_IDS.saveEmailsButton).click();
    // The confirm only queues the PATCH; callers navigate away right after, and a navigation
    // within ~300 ms unloaded the page before the request left, so the voucher config was
    // never saved and the order details never showed the resend button.
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/checkout/configurations')
    );
    await this.page
      .getByTestId(CUSTOMER_NOTIFICATION_DATA_TEST_IDS.saveEmailsConfirmButton)
      .click();
    expect((await saveResponse).ok(), 'Saving the voucher email configuration failed').toBe(true);
  }

  private async clickAndWaitForProfileUpdate(control: Locator) {
    await expect(control).toBeVisible();
    const responsePromise = this.page.waitForResponse(
      (response) => response.request().method() === 'PUT' && response.url().includes('/profile')
    );

    await control.click();
    await responsePromise;
  }
}
