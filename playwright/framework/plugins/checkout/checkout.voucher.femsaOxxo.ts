import { Context, FrameworkPlugin } from '../interface';
import { FemsaOxxoCashVoucherPage } from '@pages/voucher/femsaOxxoVoucherPage';

export class PluginCheckoutVoucherFemsaOxxo extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.femsaOxxo';

  femsaOxxoPage!: FemsaOxxoCashVoucherPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.femsaOxxoPage = new FemsaOxxoCashVoucherPage(context.page);
  }

  // async $tf_assertFemsaOxxoDisclaimer() {
  //   '@description: Asserts that the Femsa OXXO Cash voucher disclaimer is visible. Not yet connected to page object.';
  //   throw new Error('Not yet connected to page object');
  // }

  /** @description Asserts that the Femsa OXXO Cash voucher title, description, and reference title are all visible. */
  async $tf_assertFemsaOxxoCashVoucher() {
    await this.femsaOxxoPage.assertFemsaOxxoCashVoucher();
  }

  /** @description Asserts that the Femsa OXXO Cash voucher due date container is visible. */
  async $tf_assertFemsaOxxoCashVoucherDueDate() {
    await this.femsaOxxoPage.assertFemsaOxxoCashVoucherDueDate();
  }

  /** @description Asserts that the Femsa OXXO Cash voucher additional info section and disclaimer text are visible. */
  async $tf_assertFemsaOxxoCashVoucherAdditionalInfo() {
    await this.femsaOxxoPage.assertFemsaOxxoCashVoucherAdditionalInfo();
  }

  /** @description Clicks the order summary button and asserts the pending payment label is visible on the Femsa OXXO Cash thank-you page. */
  async $tf_assertFemsaOxxoCashVoucherOrderSummary() {
    await this.femsaOxxoPage.assertFemsaOxxoCashVoucherOrderSummary();
  }
}
