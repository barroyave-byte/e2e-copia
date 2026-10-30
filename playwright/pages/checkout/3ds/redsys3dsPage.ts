import { Locator, Page } from '@playwright/test';

export class Redsys3dsPage {
  readonly page: Page;
  readonly buttonSubmitChallenge: Locator;
  readonly denyChallengeToggle: Locator;

  //Locators
  constructor(page: Page) {
    this.page = page;

    this.buttonSubmitChallenge = page.locator('[id="boton"]');
    this.denyChallengeToggle = page.locator('#input2 input[type="radio"]');
  }

  //Actions
  async clickOnSubmitChallenge(): Promise<void> {
    await this.buttonSubmitChallenge.click();
  }

  async toggleDenyChallenge(): Promise<void> {
    await this.denyChallengeToggle.click();
  }
}
