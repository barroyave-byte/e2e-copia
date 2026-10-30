import { Context, FrameworkPlugin } from '../interface';
import { VenmoFormPage } from '@pages/explore/forms/venmoFormPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

export class PluginCheckoutWalletVenmo extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.venmo';

  private formPage!: VenmoFormPage;
  private paymentPage!: PaymentPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.formPage = new VenmoFormPage(context.page);
    this.paymentPage = new PaymentPage(context.page, 'EN');
  }

  /** @description Selects Venmo as payment method and clicks the pay button on the checkout form. */
  async $tf_selectVenmoForm() {
    await this.formPage.selectVenmoForm();
    await this.formPage.clickOnPayButton();
  }

  /** @description Asserts that the PayPal SPB button is visible on the checkout page. */
  async $tf_assertPaypalSpbButton() {
    await this.paymentPage.assertPaypalSpbButton();
  }

  /** @description Verifies the visual consistency of the Venmo disclaimer iframe. */
  async $tf_verifyDisclaimerVisualConsistency(params: { snapshotName: string }) {
    await this.paymentPage.page.waitForTimeout(1000);
    await verifyIframeVisualConsistency({
      frameLocator: this.paymentPage.iframeZoidVisible,
      snapshotName: params.snapshotName,
      viewports: commonViewportSets.desktopAndFullscreen,
    });
  }
}
