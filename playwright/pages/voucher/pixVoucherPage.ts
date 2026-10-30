import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { getTranslations } from '@support/translations/getTranslations';
import { VoucherTranslations } from '@support/translations/selectors/voucher/voucherTranslations';
import { PURCHASE_URL_PATTERN } from '@support/utils/purchase-contracts';

const voucherTranslations: VoucherTranslations = getTranslations('voucher', 'ES');

export class PixVoucherPage extends CommonsActions {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;
  readonly iframeRootLocator: Locator;

  readonly containerPixVoucherQrCode: Locator;

  readonly labelPixVoucherTitle: Locator;
  readonly labelPixVoucherDescription: Locator;
  readonly labelPixWaitingConfirmationTitle: Locator;
  readonly labelPixVoucherReferenceTitle: Locator;
  readonly labelPixVoucherReferenceTitleForQR: Locator;
  readonly labelPixVoucherCountdown: Locator;
  readonly labelPixVoucherCountdownTime: Locator;
  readonly labelPixVoucherCancelConfirmationTitle: Locator;
  readonly labelPixVoucherCancelConfirmationDescription: Locator;
  readonly labelPixVoucherExpirationText: Locator;

  readonly buttonCopyReference: Locator;
  readonly iconCopySuccessCheck: Locator;
  readonly buttonDownloadReference: Locator;
  readonly buttonCancel: Locator;
  readonly buttonCancelConfirmation: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.iframeRootLocator = this.iframeZoidVisible.locator(':root');

    this.containerPixVoucherQrCode = this.iframeZoidVisible
      .getByTestId('voucher-qr-code-section')
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-card-content'));

    this.labelPixVoucherTitle = this.iframeZoidVisible
      .getByText(voucherTranslations.screenPixProcessor.title)
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-header-title'));
    this.labelPixVoucherDescription = this.iframeZoidVisible
      .getByText(voucherTranslations.screenPixProcessor.description)
      .or(
        this.iframeZoidVisible
          .getByTestId('declarative-apm-card-content')
          .getByText(voucherTranslations.screenPixProcessor.description)
      );
    this.labelPixWaitingConfirmationTitle = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.waitingConfirmationTitle
    );
    this.labelPixVoucherReferenceTitle = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.referenceTitle
    );
    this.labelPixVoucherReferenceTitleForQR = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.referenceTitleForQR
    );
    this.labelPixVoucherCountdown = this.iframeZoidVisible
      .getByTestId('voucher-countdown-active-text')
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-expiration'));
    this.labelPixVoucherCountdownTime = this.iframeZoidVisible
      .getByTestId('voucher-countdown-active-time')
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-expiration').locator('p').last());
    this.labelPixVoucherCancelConfirmationTitle = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.cancelConfirmationTitle
    );
    this.labelPixVoucherCancelConfirmationDescription = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.cancelConfirmationDescription
    );
    this.labelPixVoucherExpirationText = this.iframeZoidVisible.getByText(
      voucherTranslations.screenPixProcessor.expirationText
    );

    this.buttonCopyReference = this.iframeZoidVisible
      .getByTestId('content_copy')
      .or(this.iframeZoidVisible.getByTestId('declarative-apm-copy-reference'));
    this.buttonDownloadReference = this.iframeZoidVisible
      .getByTestId('download_reference-button')
      .or(
        this.iframeZoidVisible
          .getByTestId('declarative-apm-cta-buttons')
          .getByRole('button')
          .first()
      );
    this.buttonCancel = this.iframeZoidVisible
      .getByTestId('cancel-button')
      .or(
        this.iframeZoidVisible.getByTestId('declarative-apm-cta-buttons').getByRole('button').last()
      );
    this.buttonCancelConfirmation = this.iframeZoidVisible.getByRole('button', {
      name: voucherTranslations.screenPixProcessor.cancelConfirmationButton,
    });

    this.iconCopySuccessCheck = this.iframeZoidVisible
      .locator('[data-testid="declarative-apm-copy-reference"] svg.lucide-check')
      .or(this.iframeZoidVisible.locator('svg.lucide-check'));
  }

  // Mocks
  /**
   * Intercepts purchase and order status polling endpoints to override voucher expiration date.
   *
   * Why:
   * By default, the payment provider generates a voucher with a 2-minute (120s) expiration.
   * Waiting 120s in E2E tests introduces unnecessary latency and flakiness.
   * This mock sets a short expiration (e.g. 10s) across both the initial purchase response
   * and subsequent order status polling requests, allowing deterministic validation of:
   * 1. Countdown timer display
   * 2. Auto-closing/expiration behavior when timer hits 0
   * 3. Return to payment selection screen
   *
   * @param expirationSeconds Duration in seconds until voucher expires
   */
  async mockVoucherExpiration(expirationSeconds: number) {
    let activeExpirationDate: string = new Date(
      Date.now() + expirationSeconds * 1000
    ).toISOString();

    /**
     * Recursively traverses and replaces any `expiration_date` field in the payload
     * so that all Liquid template bindings (e.g. `authorization_bank_transfer.expiration_date`
     * or `next_action.authorization_bank_transfer.expiration_date`) receive the mocked date.
     */
    const patchExpiration = (obj: any, date: string): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      let modified = false;

      const traverse = (current: any) => {
        if (!current || typeof current !== 'object') return;
        for (const key of Object.keys(current)) {
          if (key === 'expiration_date' && typeof current[key] === 'string') {
            current[key] = date;
            modified = true;
          } else if (typeof current[key] === 'object' && current[key] !== null) {
            traverse(current[key]);
          }
        }
      };

      traverse(obj);

      const paymentData =
        obj?.order?.payment?.data ??
        obj?.data?.order?.payment?.data ??
        obj?.payment?.data ??
        obj?.data;

      if (paymentData) {
        if (!paymentData.authorization_bank_transfer) {
          paymentData.authorization_bank_transfer = {};
        }
        paymentData.authorization_bank_transfer.expiration_date = date;

        if (paymentData.next_action?.authorization_bank_transfer) {
          paymentData.next_action.authorization_bank_transfer.expiration_date = date;
        }
        modified = true;
      }

      return modified;
    };

    // Non-colliding pattern for order status polling (excludes /purchase)
    const ORDER_URL_PATTERN = /\/merchants\/orders\/(?!purchase)[^/?#]+/;

    // Intercept initial purchase response
    await this.page.route(PURCHASE_URL_PATTERN, async (route) => {
      const response = await route.fetch();
      try {
        activeExpirationDate = new Date(Date.now() + expirationSeconds * 1000).toISOString();
        const json = await response.json();
        const patched = patchExpiration(json, activeExpirationDate);
        console.log(
          `[INFO] mockVoucherExpiration: purchase intercepted, patched=${patched}, date=${activeExpirationDate}`
        );
        if (patched) {
          await route.fulfill({ response, json });
          return;
        }
      } catch (err) {
        console.log('[ERROR] mockVoucherExpiration purchase error:', err);
      }
      await route.fulfill({ response });
    });

    // Intercept periodic order polling (every ~3s) so the widget doesn't overwrite
    // the mocked expiration date with the real 2-minute date from backend
    await this.page.route(ORDER_URL_PATTERN, async (route) => {
      const response = await route.fetch();
      if (route.request().method() === 'GET') {
        try {
          const json = await response.json();
          const patched = patchExpiration(json, activeExpirationDate);
          console.log(
            `[INFO] mockVoucherExpiration: order GET intercepted, patched=${patched}, date=${activeExpirationDate}`
          );
          if (patched) {
            await route.fulfill({ response, json });
            return;
          }
        } catch (err) {
          console.log('[ERROR] mockVoucherExpiration order error:', err);
        }
      }
      await route.fulfill({ response });
    });
  }

  // Actions
  async clickOnCopyReference() {
    await this.ensureVisibleToClick(this.buttonCopyReference);
  }

  async assertCopyCheckIcon() {
    await this.ensureVisible(this.iconCopySuccessCheck, {});
  }

  async clickOnCancel() {
    await this.ensureVisibleToClick(this.buttonCancel);
    const hasConfirmationModal = await this.labelPixVoucherCancelConfirmationTitle
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (hasConfirmationModal) {
      await this.ensureVisible(this.labelPixVoucherCancelConfirmationDescription, {});
      await this.ensureVisibleToClick(this.buttonCancelConfirmation);
    }
  }

  // Assertions
  async assertPixVoucher() {
    await this.ensureVisible(this.labelPixVoucherTitle, {});
    await this.ensureVisible(this.labelPixVoucherDescription, {});
    await this.ensureVisible(this.containerPixVoucherQrCode, {});
    await this.assertPixVoucherCountdown();
  }

  async assertPixVoucherReferenceTitle(hasCode: boolean) {
    if (hasCode) {
      await this.ensureVisible(this.labelPixVoucherReferenceTitle, {});
    } else {
      await this.ensureVisible(this.labelPixVoucherReferenceTitleForQR, {});
    }
  }

  async assertPixVoucherCountdown() {
    await this.ensureVisible(this.labelPixVoucherCountdown, {});
    await this.ensureVisible(this.labelPixVoucherCountdownTime, {});
  }

  async assertDownloadReferenceButton() {
    // In Chromium/Playwright headed mode, native window.print() opens an OS print dialog
    // that freezes automation. We spy on window.print() both in top window and iframe context,
    // intercepting the call and asserting that print/download was indeed requested.
    await this.iframeRootLocator
      .evaluate(() => {
        (window as any).__printTriggered = false;
        window.print = () => {
          (window as any).__printTriggered = true;
        };
      })
      .catch(() => {});

    await this.page
      .evaluate(() => {
        (window as any).__printTriggered = false;
        window.print = () => {
          (window as any).__printTriggered = true;
        };
      })
      .catch(() => {});

    await this.ensureVisibleToClick(this.buttonDownloadReference);

    const wasTriggered = await this.iframeRootLocator
      .evaluate(() => (window as any).__printTriggered === true)
      .catch(async () => {
        return await this.page
          .evaluate(() => (window as any).__printTriggered === true)
          .catch(() => false);
      });

    expect(wasTriggered).toBeTruthy();
  }

  async assertPixVoucherExpirationText() {
    await this.ensureVisible(this.labelPixVoucherExpirationText, { timeout: 120000 });
  }

  async assertPixVoucherCountdownHidden(timeout = 5000) {
    await expect(this.labelPixVoucherCountdown).toBeHidden({ timeout });
  }

  async assertPixVoucherHidden(timeout = 5000) {
    await expect(this.containerPixVoucherQrCode).toBeHidden({ timeout });
    await expect(this.labelPixVoucherCountdown).toBeHidden({ timeout });
  }
}
