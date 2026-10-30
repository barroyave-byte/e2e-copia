import { CommonsActions } from '@pages/commonActions';
import { FrameLocator, Locator, Page } from '@playwright/test';

export class SpeiVoucherPage extends CommonsActions {
  readonly page: Page;
  readonly iframeZoidVisible: FrameLocator;
  readonly divVoucherHeader: Locator;
  readonly divVoucherBody: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.divVoucherHeader = this.iframeZoidVisible.getByTestId('voucher-header');
    this.divVoucherBody = this.iframeZoidVisible.getByTestId('voucher-body');
  }

  async assertSpeiVoucher() {
    await this.assertIsVisible(this.divVoucherHeader, { timeout: 20_000 });
    await this.assertIsVisible(this.divVoucherBody, { timeout: 20_000 });
  }
}
