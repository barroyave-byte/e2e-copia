import { Context, FrameworkPlugin } from '../interface';
import { NextActionPage } from '@pages/explore/nextActionPage';

export class PluginCheckoutNextAction extends FrameworkPlugin {
  pluginBaseName = 'checkout.nextAction';

  nextActionPage!: NextActionPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.nextActionPage = new NextActionPage(context.page);
  }

  /** @description Asserts that the Go to Site button is visible on the Next Action page. Waits for the checkout iframe to mount first, then checks the button. Default timeout is 20s, pass a higher value for slow flows like 3DS redirect. */
  async $tf_assertGoToSiteButtonVisible({ timeout }: { timeout?: number } = {}) {
    await this.nextActionPage.assertGoToSiteButtonVisible(timeout);
  }

  /** @description Clicks the Go to Site button on the Next Action page. Waits up to 40 seconds for the button to be visible and clickable. */
  async $tf_clickGoToSiteButton() {
    await this.nextActionPage.clickGoToSiteButton();
  }
}
