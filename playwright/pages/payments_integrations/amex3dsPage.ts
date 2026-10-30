import { Locator, Page, expect } from "@playwright/test";
import { Challenge3dsPage } from "../checkout/3ds/challenge3dsPage";

let challenge3dsPage: Challenge3dsPage;
export class Amex3dsPage {
  readonly page: Page;

  //Locators
  constructor(page: Page) {
    this.page = page;
  }

  //Actions:
  async complete3DSChallenge(page) {
    //First I load reading with any name in this case "popup"
    const popupPromise = page.waitForEvent('popup');
    //Start with one click on the button that opens the tab
    await page.getByText('open the popup').click();
    await page.waitForLoadState();
    const popup = await popupPromise;
    //Wait for the popup to load.
    await popup.waitForLoadState('domcontentloaded');
    await challenge3dsPage.selectSuccessChallengeAmex();
  }

  //Assertions:
  async assertImAmex3DSChallengePage() {
    await expect(challenge3dsPage.labelTitle3dsAmexPopUp).toHaveText("ACS Emulator for 3DS V2");
  }
}
