import { expect, FrameLocator, Locator, Page } from '@playwright/test';

export class Challenge3dsPage {
  readonly page: Page;
  readonly frameChallenge: FrameLocator;
  readonly selectOptionsChallenge: Locator;
  readonly buttonSubmitChallenge: Locator;
  readonly inputSecurityCodeOpenPay: Locator;
  readonly buttonSendCodeOpenPay: Locator;
  readonly buttonSuccessAuthentication: Locator;
  readonly buttonRedirect: Locator;
  readonly inputCodePlacetopay: Locator;
  readonly buttonSendCodePlacetopay: Locator;
  readonly buttonNextChallengePlacetopay: Locator;
  readonly inputCodeKushki: Locator;
  readonly buttonSendCodeKushki: Locator;
  readonly buttonFail3dsStripe: Locator;
  readonly buttonAuthorize3dsStripe: Locator;
  readonly buttonSuccess3dsGlobalpay: Locator;
  readonly buttonSuccessThreedsUnlimit: Locator;
  readonly radioButtonSuccessOptionThreeDSRedsys: Locator;
  readonly radioButtonFailureOptionThreeDSRedsys: Locator;
  readonly buttonRedsysSubmitChallenge: Locator;
  readonly buttonFailedThreedsUnlimit: Locator;
  readonly buttonFailed3dsGlobalpay: Locator;
  readonly buttonRedirectGlobalpay: Locator;
  readonly buttonSuccess3dsCredibanco: Locator;
  readonly buttonFailed3dsCredibanco: Locator;
  readonly buttonRedirect3dsCredibanco: Locator;
  readonly labelTitle3dsAmexPopUp: Locator;
  readonly frameChallengePlaceToPay: FrameLocator;
  readonly frameChallengeCybersource: FrameLocator;
  readonly frameStripeGeneral: FrameLocator;
  readonly buttonSuccessThreedsFiserv: Locator;
  readonly buttonFailedThreedsFiserv: Locator;
  readonly inputSecurityCodePowertranz: Locator;
  readonly buttonSubmit3dsPowertranz: Locator;
  readonly apmRedirectFrame: FrameLocator;

  readonly challengeMit: Locator;
  readonly inputSecurityCodeMit: Locator;
  readonly buttonSubmitMit: Locator;

  readonly inputCodeCybersource: Locator;
  readonly buttonSubmit3dsCybersource: Locator;
  readonly divPurchaseStatusView: Locator;

  //Locators
  constructor(page: Page) {
    this.page = page;
    this.frameChallenge = page.frameLocator('#challengeFrame');
    this.frameStripeGeneral = page
      .frameLocator('xpath=//iframe[contains(@name, "privateStripe")]')
      .first();
    this.frameChallengePlaceToPay = page.frameLocator('#challengeIframe');
    this.frameChallengeCybersource = page.frameLocator('iframe[id^="cardinal-stepUpIframe-"]');
    this.selectOptionsChallenge = page.locator('[id="selectAuthResult"]');
    this.buttonSubmitChallenge = page.locator('[id="acssubmit"]');
    this.inputSecurityCodeOpenPay = page.locator('[name="codevalidation"]');
    this.buttonSendCodeOpenPay = page.locator('[id="SendButton"]');
    this.buttonSuccessAuthentication = page.locator('#btn1');
    this.buttonRedirect = page.locator('#btn5');
    this.inputCodePlacetopay = page.locator('[id="textCode"]');
    this.buttonSendCodePlacetopay = page.locator('[value="Submit"]');
    this.buttonNextChallengePlacetopay = page.locator('[value="Next"]');
    this.inputCodeKushki = page.locator('[id="txtOtp"]');
    this.buttonSendCodeKushki = page.locator('[id="btnSubmit"]');
    this.buttonAuthorize3dsStripe = page.locator('#test-source-authorize-3ds');
    this.buttonFail3dsStripe = page.locator('#test-source-fail-3ds');
    this.labelTitle3dsAmexPopUp = page.locator('h1:has-text("ACS Emulator for 3DS V2")');
    this.buttonSuccess3dsGlobalpay = page.locator('#btn1');
    this.buttonFailed3dsGlobalpay = page.locator('#btn3');
    this.buttonRedirectGlobalpay = page.locator('#btn5');
    this.buttonSuccess3dsCredibanco = page.locator('.btn-success:has-text("Success")');
    this.buttonFailed3dsCredibanco = page.locator('.btn-fail:has-text("Fail")');
    this.buttonRedirect3dsCredibanco = page.locator(
      '.Button__button:has-text("Volver al comercio")'
    );

    this.buttonSuccessThreedsUnlimit = page.locator('#successButton');
    this.buttonFailedThreedsUnlimit = page.locator('#failureButton');

    this.radioButtonSuccessOptionThreeDSRedsys = page.locator(`input[name='option'][value='1']`);
    this.radioButtonFailureOptionThreeDSRedsys = page.locator(`input[name='option'][value='2']`);
    this.buttonRedsysSubmitChallenge = page.locator('#boton');

    this.buttonSuccessThreedsFiserv = page.locator('button#yes');
    this.buttonFailedThreedsFiserv = page.locator('button#no');

    this.inputSecurityCodePowertranz = page.locator('input[type="password"]');
    this.buttonSubmit3dsPowertranz = page.locator('button[type="submit"]');

    this.apmRedirectFrame = page.frameLocator('[data-testid="apm-redirect-iframe"]');
    this.challengeMit = page.locator('form');
    this.inputSecurityCodeMit = page.locator('#password');
    this.buttonSubmitMit = page.locator('#submit_accept');

    this.inputCodeCybersource = page.locator(
      '#content > div:nth-child(2) > form:nth-child(2) > input.input-field'
    );
    this.buttonSubmit3dsCybersource = page.locator(
      '#content > div:nth-child(2) > form:nth-child(2) > input.button.primary'
    );
    this.divPurchaseStatusView = page.locator('#purchase-status-view');
  }

  async selectSuccessChallengeMIT() {
    await this.challengeMit.locator(this.inputSecurityCodeMit).fill('555');
    await expect(this.challengeMit.locator(this.buttonSubmitMit)).toBeVisible();
    await this.challengeMit.locator(this.buttonSubmitMit).click();
  }

  async selectSuccessChallengeAmex() {
    await expect(this.frameChallenge.locator(this.labelTitle3dsAmexPopUp)).toBeVisible();
    await this.frameChallenge.locator(this.selectOptionsChallenge).selectOption('AUTHENTICATED');
    await expect(this.frameChallenge.locator(this.buttonSubmitChallenge)).toBeVisible();
    await this.frameChallenge.locator(this.buttonSubmitChallenge).click();
  }
  async selectWrongChallengeAmex() {
    await expect(this.frameChallenge.locator(this.labelTitle3dsAmexPopUp)).toBeVisible();
    await this.frameChallenge.locator(this.selectOptionsChallenge).selectOption('UNAUTHENTICATED');
    await this.frameChallenge.locator(this.buttonSubmitChallenge).click();
  }

  async selectSuccessChallengeGlobalpay() {
    await expect(this.buttonSuccess3dsGlobalpay).toBeVisible();
    await this.buttonSuccess3dsGlobalpay.click();
    await expect(this.buttonRedirectGlobalpay).toBeVisible();
    await this.buttonRedirectGlobalpay.click();
  }

  // This function is not USED anymore and can be deleted in future commits
  async selectSuccessChallengeCredibanco() {
    await expect(this.buttonSuccess3dsCredibanco).toBeVisible();
    await this.buttonSuccess3dsCredibanco.click();
    await expect(this.buttonRedirect3dsCredibanco).toBeVisible();
    await this.buttonRedirect3dsCredibanco.click();
  }

  // This function is not USED anymore and can be deleted in future commits
  async selectRedirectChallengeCredibanco() {
    await expect(this.buttonRedirect3dsCredibanco).toBeVisible();
    await this.buttonRedirect3dsCredibanco.click();
  }

  async selectFailedChallengeGlobalpay() {
    await expect(this.buttonFailed3dsGlobalpay).toBeVisible();
    await this.buttonFailed3dsGlobalpay.click();
    await expect(this.buttonRedirectGlobalpay).toBeVisible();
    await this.buttonRedirectGlobalpay.click();
  }

  async selectSuccessChallengeFiserv() {
    await expect(this.buttonSuccessThreedsFiserv).toBeVisible();
    await this.buttonSuccessThreedsFiserv.click();
  }

  async selectFailedChallengeFiserv() {
    await expect(this.buttonFailedThreedsFiserv).toBeVisible();
    await this.buttonFailedThreedsFiserv.click();
  }

  async selectSuccessChallengeUnlimit() {
    await expect(this.buttonSuccessThreedsUnlimit).toBeVisible();
    await this.buttonSuccessThreedsUnlimit.click();
  }

  async selectSuccessChallengeRedsys() {
    await this.page.waitForTimeout(3000);
    await this.radioButtonSuccessOptionThreeDSRedsys.check();
    await this.buttonRedsysSubmitChallenge.click();
  }

  async selectDeniedChallengeRedsys() {
    await this.page.waitForTimeout(3000);
    await this.radioButtonFailureOptionThreeDSRedsys.check();
    await this.buttonRedsysSubmitChallenge.click();
  }

  async selectFailedChallengeUnlimit() {
    await expect(this.buttonFailedThreedsUnlimit).toBeVisible();
    await this.buttonFailedThreedsUnlimit.click();
  }

  async selectSuccessChallengeCybersource() {
    await expect(this.frameChallengeCybersource.locator(this.inputCodeCybersource)).toBeVisible();
    await this.frameChallengeCybersource.locator(this.inputCodeCybersource).fill('1234');
    await this.frameChallengeCybersource.locator(this.buttonSubmit3dsCybersource).click();
  }

  async selectSuccessChallengeOpenPay() {
    await this.inputSecurityCodeOpenPay.type('123456');
    await this.buttonSendCodeOpenPay.click();
  }

  // Stripe embeds 3DS in a cross-origin __privateStripeFrame iframe where Playwright's
  // click() fails silently. We poll for the button and use JS click via evaluate().
  private async clickStripe3dsButton(
    buttonSelector: string,
    waitForClose: boolean = false,
    closePage: boolean = true
  ) {
    const startTime = Date.now();
    const timeout = 45000;

    while (Date.now() - startTime < timeout) {
      if (await this.clickStripeButtonInAnyFrame(buttonSelector)) {
        // Outside the frame search on purpose: a failure here is the outcome of the challenge
        // (ENTP1-T2577: the popup closed before showing the status). Swallowing it resumed the
        // search and the test failed later on a closed page, with an unrelated message.
        if (waitForClose) {
          await this.page.waitForEvent('close', { timeout: 20_000 });
        } else {
          await expect(
            this.divPurchaseStatusView,
            'The 3DS popup should show the purchase status after the Stripe challenge'
          ).toBeVisible({ timeout: 55_000 });
        }

        if (closePage) {
          await this.page.close();
        }
        return;
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error('3DS:stripe -- Could not find button in any frame');
  }

  /** Frames detach while the challenge loads, so a failed lookup in one frame moves on to the next. */
  private async clickStripeButtonInAnyFrame(buttonSelector: string): Promise<boolean> {
    for (const frame of this.page.frames()) {
      const button = frame.locator(buttonSelector);
      if ((await button.count().catch(() => 0)) === 0) continue;
      const clicked = await button
        .evaluate((el: HTMLElement) => el.click())
        .then(
          () => true,
          () => false
        );
      if (clicked) return true;
    }
    return false;
  }

  async selectPassChallengeStripe(waitForClose: boolean = false, closePage: boolean = true) {
    await this.clickStripe3dsButton('#test-source-authorize-3ds', waitForClose, closePage);
  }

  async selectFailChallengeStripe(waitForClose: boolean = false, closePage: boolean = true) {
    await this.clickStripe3dsButton('#test-source-fail-3ds', waitForClose, closePage);
  }

  async assertPurchaseStatusText(text: string) {
    await expect(this.divPurchaseStatusView.getByText(text, { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  }

  async closePopupPage() {
    await this.page.close();
  }

  async selectPassChallengeStripeAPMModal() {
    // Then, within that frame, locate the Stripe iframe
    const stripeFrame = this.apmRedirectFrame.frameLocator('iframe[name*="privateStripe"]').first();

    // Then, within the Stripe frame, locate the challenge frame
    const challengeFrame = stripeFrame.frameLocator('#challengeFrame').first();

    // Finally, locate the authorize button within the challenge frame
    const authorizeButton = challengeFrame.locator('#test-source-authorize-3ds');

    await expect(authorizeButton, 'The button authorize 3ds Stripe is not visible').toBeVisible();

    await authorizeButton.click();
  }

  async selectSuccessChallengeEvopayments() {
    await this.frameChallenge.locator(this.selectOptionsChallenge).selectOption('AUTHENTICATED');
    await this.frameChallenge.locator(this.buttonSubmitChallenge).click();
  }

  async selectSuccessChallengePaymentez() {
    await expect(this.buttonSuccessAuthentication).toBeVisible();
    await this.buttonSuccessAuthentication.click();
    await expect(this.buttonRedirect).toBeVisible();
    await this.buttonRedirect.click();
  }

  async selectSuccessChallengePlacetopay() {
    await expect(this.frameChallengePlaceToPay.locator(this.inputCodePlacetopay)).toBeVisible();
    await this.page.waitForTimeout(2000);
    await this.frameChallengePlaceToPay.locator(this.inputCodePlacetopay).fill('123456');
    await expect(
      this.frameChallengePlaceToPay.locator(this.buttonSendCodePlacetopay)
    ).toBeVisible();
    await this.frameChallengePlaceToPay.locator(this.buttonSendCodePlacetopay).click();
    await expect(
      this.frameChallengePlaceToPay.locator(this.buttonNextChallengePlacetopay)
    ).toBeVisible();
    await this.frameChallengePlaceToPay.locator(this.buttonNextChallengePlacetopay).click();
  }

  async selectSuccessChallengeKushki() {
    const locatorInputCode = this.frameChallenge.locator(this.inputCodeKushki);
    const locatorButtonSendCode = this.frameChallenge.locator(this.buttonSendCodeKushki);
    await expect(locatorInputCode, '')
      .toBeVisible({ timeout: 20000 })
      .then(() => locatorInputCode.fill('1234'));
    await expect(locatorButtonSendCode)
      .toBeVisible()
      .then(() => locatorButtonSendCode.click());
  }

  //Assertions:
  async assertImAmex3DSChallengePage() {
    await expect(this.frameChallenge.locator(this.labelTitle3dsAmexPopUp)).toBeVisible();
  }

  async assertAPMModalMounted() {
    await expect(
      this.page.locator('[data-testid="apm-redirect-iframe"]'),
      'APM Modal iframe is not visible'
    ).toBeVisible();
  }

  async selectSuccessChallengePowertranz() {
    await expect(this.buttonSubmit3dsPowertranz).toBeVisible();
    await this.inputSecurityCodePowertranz.fill('3ds2', { timeout: 15000 });
    await this.buttonSubmit3dsPowertranz.click();
  }
}
