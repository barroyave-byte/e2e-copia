import { Context, FrameworkPlugin } from '../interface';
import { ValidateEmailPage } from '@pages/checkout/user_data/validateEmailPage';
import { BaseUserAddress } from '@support/interfaces/address_user';

export interface EnterEmailParams {
  email: string;
  userAddress?: BaseUserAddress;
}

export class PluginCheckoutEmail extends FrameworkPlugin {
  pluginBaseName = 'checkout.email';

  pageObject!: ValidateEmailPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new ValidateEmailPage(context.page);
  }

  /** @description Asserts that the email input is visible in the checkout widget, verifying the email step is rendered. */
  async $tf_validateEmail() {
    await this.pageObject.assertInputEmailIsVisible();
  }

  /** @description Fills the email field with the given address (handling already-logged-in sessions) and clicks the Continue button to advance the checkout flow. */
  async $tf_enterEmailAndContinue({ email, userAddress }: EnterEmailParams) {
    await this.pageObject.emailNewUserAndContinue(email, userAddress);
  }
}
