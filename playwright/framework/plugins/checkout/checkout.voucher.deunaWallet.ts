import { Context, FrameworkPlugin } from '../interface';
import { DeunaWalletFormPage } from '@pages/explore/forms/deunaWalletFormPage';
import { VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

type ViewportSetKey = keyof typeof commonViewportSets;

export class PluginCheckoutVoucherDeunaWallet extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.deunaWallet';

  formPage!: DeunaWalletFormPage;
  voucherPage!: VoucherProcessorsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.formPage = new DeunaWalletFormPage(context.page);
    this.voucherPage = new VoucherProcessorsPage(context.page);
  }

  /** @description Selects Deuna Wallet in the Formularios payment methods list and clicks the embed button. For the QR processor format this embeds the widget and triggers the purchase directly, landing on the post-purchase voucher/QR view with no further input. */
  async $tf_selectDeunaWalletForm() {
    await this.formPage.selectDeunaWalletForm();
  }

  /** @description Asserts that the Deuna Wallet post-purchase voucher is visible: header price, headings (header/body/due date/footer), and the rendered QR code image or 6-digit payment code (per `format`, defaults to 'qr'). */
  async $tf_assertDeunaWalletVoucher(params: { price: string; format?: 'qr' | 'code' }) {
    await this.voucherPage.assertDeunaWalletHeaderPrice(params.price);
    await this.voucherPage.assertDeunaWalletHeadings();
    if (params.format === 'code') {
      await this.voucherPage.assertPaymentCodeIsVisible();
    } else {
      await this.voucherPage.assertQrCodeIsVisible();
    }
  }

  /** @description Captures a visual snapshot of the Deuna Wallet post-purchase voucher view (QR image or 6-digit code, left visible — only the countdown/animation is masked) across the specified viewport set. Call right after assertDeunaWalletVoucher, same as the proven ENTP1-T2561/T2562 flow — no extra waits in between, since the order moves on from this view a few seconds after it renders. */
  async $tf_verifyVoucherVisualConsistency(params: {
    snapshotName: string;
    viewports?: ViewportSetKey;
  }) {
    await verifyIframeVisualConsistency({
      frameLocator: this.voucherPage.voucherFrame,
      snapshotName: params.snapshotName,
      viewports: commonViewportSets[params.viewports ?? 'desktopOnly'],
      options: {
        // Only mask the ticking countdown/animation — the QR image or 6-digit code
        // itself must stay visible in the reference so the baseline shows the real view.
        maskLocators: [
          this.voucherPage.sectionVoucherCountdown,
          this.voucherPage.animationPulsingDots,
        ],
      },
    });
  }
}
