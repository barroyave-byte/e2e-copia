import { Context, FrameworkPlugin } from '../interface';
import { PostTransactionPage } from '@pages/checkout/post_transaction/postTransactionPage';

export interface AssertOrderConfirmedParams {
  message: string;
}

export class PluginCheckoutPostTransaction extends FrameworkPlugin {
  pluginBaseName = 'checkout.postTransaction';

  private _pageObject: PostTransactionPage | null = null;

  private get pageObject(): PostTransactionPage {
    if (!this._pageObject) {
      this._pageObject = new PostTransactionPage(this.context.page);
    }
    return this._pageObject;
  }

  setTestContext(context: Context) {
    super.setTestContext(context);
    this._pageObject = null;
  }

  /** @description Asserts that the thank-you post-transaction screen is visible by checking that the success message "¡Gracias por elegirnos!" is displayed. */
  async $tf_assertThankYouPage() {
    await this.pageObject.assertPostTransactionSuccessMessage();
  }

  /** @description Asserts that the order confirmed screen is visible by waiting for the provided message text to appear within the post-transaction iframe. */
  async $tf_assertOrderConfirmed({ message }: AssertOrderConfirmedParams) {
    await this.pageObject.assertOrderProcessedWithMessage(message);
  }
}
