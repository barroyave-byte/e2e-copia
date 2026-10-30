import { expect, Page } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';

export class PluginCheckoutBnplAplazo extends FrameworkPlugin {
  pluginBaseName = 'checkout.bnpl.aplazo';

  pageObject!: AplazoRedirectPage;
  formPage!: AplazoFormPage;
  private popupPromise: Promise<Page> | undefined;
  private popup: Page | undefined;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new AplazoRedirectPage(context.page);
    this.formPage = new AplazoFormPage(context.page);
    this.popupPromise = undefined;
    this.popup = undefined;
  }

  /** @description Selects the Aplazo payment method in the Formularios experience. */
  async $tf_selectForm() {
    await this.formPage.selectAplazoForm();
  }

  /** @description Registers a popup listener and clicks the Pay button in the Formularios Aplazo flow. The popup (Aplazo redirect page) is captured for use by assertPulsingDotsVisible and closePopup. */
  async $tf_clickPayAndWaitForPopup() {
    this.popupPromise = this.context.page.waitForEvent('popup');
    await this.formPage.clickPay();
  }

  /** @description Waits for the Aplazo redirect popup to open, then asserts that the pulsing-dots processing view is visible in the checkout iframe on the main page. */
  async $tf_assertPulsingDotsVisible() {
    if (this.popupPromise) {
      this.popup = await this.popupPromise;
      this.popupPromise = undefined;
    }
    const iframe = this.context.page.frameLocator('iframe.zoid-visible');
    const pulsingDots = iframe
      .getByTestId('declarative-apm-redirect-pulsing-dots')
      .or(iframe.getByTestId('apm-redirect-pulsing-dots'));
    await expect(pulsingDots).toBeVisible({ timeout: 30000 });
  }

  /** @description Closes the Aplazo redirect popup that was opened by clickPayAndWaitForPopup. */
  async $tf_closePopup() {
    if (this.popup) {
      await this.popup.close();
      this.popup = undefined;
    }
  }

  /** @description Fills the phone number input on the Aplazo redirect page and clicks continue. Defaults to a test phone number if none is provided. */
  async $tf_sendPhoneNumber(params?: { phoneNumber?: string }) {
    await this.pageObject.sendPhonenumber(params?.phoneNumber);
  }

  /** @description Fills each digit of the OTP into the Aplazo verification input fields. Defaults to 123456 if no OTP is provided. */
  async $tf_verifyOTP(params?: { otp?: string }) {
    await this.pageObject.verifyOTPForAplazo(params?.otp);
  }

  /** @description Clicks the buy/confirm purchase button on the Aplazo redirect page. */
  async $tf_clickButtonBuy() {
    await this.pageObject.clickOnButtonBuy();
  }

  /** @description Clicks the back-to-store button on the Aplazo redirect page. */
  async $tf_clickStoreBackButton() {
    await this.pageObject.clickOnStoreBackButton();
  }

  /** @description Asserts that the purchase rejected title is visible on the Aplazo redirect page. */
  async $tf_assertRejectedPage() {
    await this.pageObject.assertRejectedPage();
  }

  /** @description Asserts that the processing order label is visible, confirming the order is being processed. */
  async $tf_assertProcessingOrder() {
    await this.pageObject.assertProcessingOrder();
  }

  /** @description Closes the Aplazo redirect page. */
  async $tf_closePage() {
    await this.pageObject.closePage();
  }
}
