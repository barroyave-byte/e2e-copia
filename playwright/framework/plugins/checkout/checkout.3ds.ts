import { Context, FrameworkPlugin } from '../interface';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { Redsys3dsPage } from '@pages/checkout/3ds/redsys3dsPage';

export class PluginCheckout3DS extends FrameworkPlugin {
  pluginBaseName = 'checkout.3ds';

  challengePage!: Challenge3dsPage;
  redsysPage!: Redsys3dsPage;
  private _popupChallengePage: Challenge3dsPage | null = null;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.challengePage = new Challenge3dsPage(context.page);
    this.redsysPage = new Redsys3dsPage(context.page);
  }

  /** @description Completes the MIT 3DS challenge by filling the security code (555) and clicking submit. */
  async $tf_selectSuccessChallengeMIT() {
    await this.challengePage.selectSuccessChallengeMIT();
  }

  /** @description Completes the Amex 3DS challenge by selecting AUTHENTICATED in the ACS emulator iframe and submitting. */
  async $tf_selectSuccessChallengeAmex() {
    await this.challengePage.selectSuccessChallengeAmex();
  }

  /** @description Completes the Amex 3DS challenge with UNAUTHENTICATED result, simulating a failed authentication. */
  async $tf_selectWrongChallengeAmex() {
    await this.challengePage.selectWrongChallengeAmex();
  }

  /** @description Completes the Globalpay 3DS challenge by clicking the success button then the redirect button. */
  async $tf_selectSuccessChallengeGlobalpay() {
    await this.challengePage.selectSuccessChallengeGlobalpay();
  }

  /** @description Completes the Globalpay 3DS challenge with a failure result, then clicks redirect. */
  async $tf_selectFailedChallengeGlobalpay() {
    await this.challengePage.selectFailedChallengeGlobalpay();
  }

  /** @description Completes the Fiserv 3DS challenge by clicking the yes/success button. */
  async $tf_selectSuccessChallengeFiserv() {
    await this.challengePage.selectSuccessChallengeFiserv();
  }

  /** @description Completes the Fiserv 3DS challenge with a failure result by clicking the no button. */
  async $tf_selectFailedChallengeFiserv() {
    await this.challengePage.selectFailedChallengeFiserv();
  }

  /** @description Completes the Unlimit 3DS challenge by clicking the success button. */
  async $tf_selectSuccessChallengeUnlimit() {
    await this.challengePage.selectSuccessChallengeUnlimit();
  }

  /** @description Completes the Unlimit 3DS challenge with a failure result by clicking the failure button. */
  async $tf_selectFailedChallengeUnlimit() {
    await this.challengePage.selectFailedChallengeUnlimit();
  }

  /** @description Completes the Redsys 3DS challenge by selecting the success radio option and submitting. */
  async $tf_selectSuccessChallengeRedsys() {
    await this.challengePage.selectSuccessChallengeRedsys();
  }

  /** @description Completes the Redsys 3DS challenge by selecting the denied/failure radio option and submitting. */
  async $tf_selectDeniedChallengeRedsys() {
    await this.challengePage.selectDeniedChallengeRedsys();
  }

  /** @description Completes the Cybersource 3DS challenge by filling the OTP code (1234) and clicking submit within the cardinal step-up iframe. */
  async $tf_selectSuccessChallengeCybersource() {
    await this.challengePage.selectSuccessChallengeCybersource();
  }

  /** @description Completes the OpenPay 3DS challenge by typing the security code (123456) and clicking the send button. */
  async $tf_selectSuccessChallengeOpenPay() {
    await this.challengePage.selectSuccessChallengeOpenPay();
  }

  /** @description Completes the Stripe 3DS challenge by polling all frames for the authorize button and clicking it via JS evaluate to overcome cross-origin iframe restrictions. */
  async $tf_selectPassChallengeStripe() {
    await this.challengePage.selectPassChallengeStripe();
  }

  /** @description Completes the Stripe 3DS challenge with a failure result by polling all frames for the fail button and clicking it via JS evaluate. */
  async $tf_selectFailChallengeStripe() {
    await this.challengePage.selectFailChallengeStripe();
  }

  /** @description Completes the Stripe 3DS challenge within the APM redirect modal by navigating the nested iframe chain (apm-redirect-iframe > Stripe iframe > challengeFrame) and clicking authorize. */
  async $tf_selectPassChallengeStripeAPMModal() {
    await this.challengePage.selectPassChallengeStripeAPMModal();
  }

  /** @description Completes the Evopayments 3DS challenge by selecting AUTHENTICATED in the ACS emulator frame and submitting. */
  async $tf_selectSuccessChallengeEvopayments() {
    await this.challengePage.selectSuccessChallengeEvopayments();
  }

  /** @description Completes the Paymentez 3DS challenge by clicking the success authentication button and then the redirect button. */
  async $tf_selectSuccessChallengePaymentez() {
    await this.challengePage.selectSuccessChallengePaymentez();
  }

  /** @description Completes the Placetopay 3DS challenge by filling the OTP code (123456), submitting, and clicking Next within the challenge iframe. */
  async $tf_selectSuccessChallengePlacetopay() {
    await this.challengePage.selectSuccessChallengePlacetopay();
  }

  /** @description Completes the Kushki 3DS challenge by filling the OTP code (1234) and clicking the send button within the challenge iframe. */
  async $tf_selectSuccessChallengeKushki() {
    await this.challengePage.selectSuccessChallengeKushki();
  }

  /** @description Completes the Credibanco 3DS challenge by clicking the success button and then the redirect button. */
  async $tf_selectSuccessChallengeCredibanco() {
    await this.challengePage.selectSuccessChallengeCredibanco();
  }

  /** @description Completes the Credibanco 3DS challenge by clicking only the redirect/back-to-merchant button. */
  async $tf_selectRedirectChallengeCredibanco() {
    await this.challengePage.selectRedirectChallengeCredibanco();
  }

  /** @description Completes the Powertranz 3DS challenge by filling the password field (3ds2) and clicking the submit button. */
  async $tf_selectSuccessChallengePowertranz() {
    await this.challengePage.selectSuccessChallengePowertranz();
  }

  /** @description Asserts that the Amex 3DS challenge page is visible by checking the ACS Emulator title inside the challenge iframe. */
  async $tf_assertImAmex3DSChallengePage() {
    await this.challengePage.assertImAmex3DSChallengePage();
  }

  /** @description Asserts that the APM redirect iframe is visible on the page, confirming that the APM modal has been mounted. */
  async $tf_assertAPMModalMounted() {
    await this.challengePage.assertAPMModalMounted();
  }

  /** @description Clicks the Redsys challenge submit button (#boton) to submit the currently selected challenge option. */
  async $tf_clickSubmitChallenge() {
    await this.redsysPage.clickOnSubmitChallenge();
  }

  /** @description Toggles the Redsys deny challenge radio input, switching the selected challenge outcome to the failure option. */
  async $tf_toggleDenyChallenge() {
    await this.redsysPage.toggleDenyChallenge();
  }

  /** @description Waits for the Amex 3DS popup window, then completes the challenge by selecting AUTHENTICATED in the ACS emulator. Delegates to Challenge3dsPage.selectSuccessChallengeAmex inside the popup context. */
  async $tf_complete3DSChallengeAmex() {
    const popupPromise = this.context.page.waitForEvent('popup');
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    const popupChallengePage = new Challenge3dsPage(popup);
    await popupChallengePage.selectSuccessChallengeAmex();
  }

  /** @description Completes the Stripe 3DS popup challenge. Picks up a popup already open in the context, or waits up to 45s for one to open. */
  async $tf_complete3DSChallengeStripe() {
    const context = this.context.page.context();
    let popup = context.pages().find((p) => p !== this.context.page && !p.isClosed());

    if (!popup) {
      popup = await this.context.page.waitForEvent('popup', { timeout: 45000 });
    }

    await popup.waitForLoadState('domcontentloaded');
    const popupChallengePage = new Challenge3dsPage(popup);
    await popupChallengePage.selectPassChallengeStripe();
  }

  /** @description Waits for the Stripe 3DS popup window, then completes the challenge with a failure result by clicking fail in the popup context. Use this action instead of selectFailChallengeStripe when render_3ds_strategy is redirect. */
  async $tf_complete3DSFailChallengeStripe() {
    const popupPromise = this.context.page.waitForEvent('popup', { timeout: 20000 });
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    const popupChallengePage = new Challenge3dsPage(popup);
    await popupChallengePage.selectFailChallengeStripe();
  }

  /** @description Waits for the Cybersource 3DS popup window the Payment Widget opens (render_3ds_strategy redirect), then completes the challenge in it by filling the OTP code (1234) in the cardinal step-up iframe. Picks up a popup that is already open, so it is safe to call after checkout.paymentWidget.clickOnPayButton. Use this action instead of selectSuccessChallengeCybersource, which acts on the main page. */
  async $tf_completeChallengeCybersourcePopup() {
    const mainPage = this.context.page;
    let popup = mainPage
      .context()
      .pages()
      .find((p) => p !== mainPage && !p.isClosed());

    if (!popup) {
      popup = await mainPage.waitForEvent('popup', { timeout: 30000 });
    }

    await popup.waitForLoadState('domcontentloaded');
    await new Challenge3dsPage(popup).selectSuccessChallengeCybersource();
  }

  /** @description Waits for the Unlimit 3DS popup window, then completes the challenge by clicking success in the popup context. Use this action instead of selectSuccessChallengeUnlimit when render_3ds_strategy is redirect. */
  async $tf_complete3DSChallengeUnlimit() {
    const popupPromise = this.context.page.waitForEvent('popup', { timeout: 20000 });
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    const popupChallengePage = new Challenge3dsPage(popup);
    await popupChallengePage.selectSuccessChallengeUnlimit();
  }

  /** @description Waits for the Stripe 3DS popup window, completes the challenge, but keeps the popup open so PurchaseStatusView assertions can run before closing. Must be followed by closePurchaseStatusPopup after assertions. */
  async $tf_complete3DSChallengeStripeKeepOpen() {
    const context = this.context.page.context();
    let popup = context.pages().find((p) => p !== this.context.page && !p.isClosed());

    if (!popup) {
      popup = await this.context.page.waitForEvent('popup', { timeout: 45000 });
    }

    await popup.waitForLoadState('domcontentloaded');
    this._popupChallengePage = new Challenge3dsPage(popup);
    await this._popupChallengePage.selectPassChallengeStripe(false, false);
  }

  /** @description Completes the Stripe 3DS challenge inline (polling all frames on the current page) without closing the page. Use this for PaymentWidget flows where 3DS appears inside the widget iframe instead of a popup. Stores reference for PurchaseStatusView assertions. */
  async $tf_selectPassChallengeStripeKeepOpen() {
    await this.challengePage.selectPassChallengeStripe(false, false);
    this._popupChallengePage = this.challengePage;
  }

  /** @description Asserts that a specific text is visible in the PurchaseStatusView. Works with both popup (complete3DSChallengeStripeKeepOpen) and inline (selectPassChallengeStripeKeepOpen) flows. */
  async $tf_assertPurchaseStatusViewText({ text }: { text: string }) {
    if (!this._popupChallengePage) {
      throw new Error(
        'No challenge page available. Call complete3DSChallengeStripeKeepOpen or selectPassChallengeStripeKeepOpen first.'
      );
    }
    await this._popupChallengePage.assertPurchaseStatusText(text);
  }

  /** @description Closes the 3DS popup page that was kept open by complete3DSChallengeStripeKeepOpen. Call this after all PurchaseStatusView assertions are done. Accepts an optional timeout (ms) to wait before closing, useful to ensure pending tracking events (e.g. redirectResultPageViewed) are captured before the popup is destroyed. Not needed for inline flows (selectPassChallengeStripeKeepOpen). */
  async $tf_closePurchaseStatusPopup({ timeout = 0 }: { timeout?: number } = {}) {
    if (!this._popupChallengePage) {
      throw new Error('No popup page available. Call complete3DSChallengeStripeKeepOpen first.');
    }
    if (timeout > 0) {
      await this._popupChallengePage.page.waitForTimeout(timeout);
    }
    await this._popupChallengePage.closePopupPage();
    this._popupChallengePage = null;
  }
}
