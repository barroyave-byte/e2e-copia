import { Context, FrameworkPlugin } from '../interface';
import { KueskipayPage } from '@pages/bnpl/kueskipayPage';

export class PluginCheckoutBnplKueski extends FrameworkPlugin {
  pluginBaseName = 'checkout.bnpl.kueski';

  pageObject!: KueskipayPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new KueskipayPage(context.page);
  }

  /** @description Fills the Kueskipay username and password fields with test credentials and clicks the login button. */
  async $tf_completeLoginAction() {
    await this.pageObject.completeLoginAction();
  }

  /** @description Clicks the buy button on the Kueskipay redirect page. */
  async $tf_clickButtonBuy() {
    await this.pageObject.clickOnButtonBuy();
  }

  /** @description Clicks the back-to-store button on the Kueskipay redirect page. */
  async $tf_clickStoreBackButton() {
    await this.pageObject.clickOnStoreBackButton();
  }

  /** @description Asserts that the purchase rejected title is visible on the Kueskipay redirect page. */
  async $tf_assertRejectedPage() {
    await this.pageObject.assertRejectedPage();
  }

  /** @description Closes the Kueskipay redirect page. */
  async $tf_closePage() {
    await this.pageObject.closePage();
  }
}
