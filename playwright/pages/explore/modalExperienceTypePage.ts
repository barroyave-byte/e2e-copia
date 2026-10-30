import { Locator, Page } from '@playwright/test';
import { ExperienceTypesExplore } from '@support/interfaces/experienceTypesExplore';

export class ModalExperienceTypePage {
  readonly page: Page;
  readonly optionPaymentWidget: Locator;
  readonly buttonConfirm: Locator;
  readonly buttonFinalizePurchase: Locator;
  readonly vaultCheckbox: Locator;
  readonly closeElementsWidgetButton: Locator;
  readonly modalContainer: Locator;

  //Locators
  constructor(page: Page) {
    this.page = page;
    this.buttonConfirm = page.locator('#confirm_button');
    this.buttonFinalizePurchase = page.locator('#finalize_purchase_button');
    this.vaultCheckbox = page.locator("[id='radiobutton_payment_vault']");
    this.closeElementsWidgetButton = page.locator("[id='close-elements-widget']");
    this.modalContainer = page.locator("[id='vault_modal_container']");
  }

  //Actions
  async clickOnConfirm() {
    await this.buttonConfirm.click();
  }

  async clickOnFinalizePurchase() {
    await this.buttonFinalizePurchase.click();
  }

  async selectExperienceType(experienceType: ExperienceTypesExplore) {
    const locatorExperienceType = this.page.locator('label').filter({ hasText: experienceType });
    await locatorExperienceType.click();
  }

  async selectExperienceTypeAndConfirm(experienceType: ExperienceTypesExplore) {
    await this.clickOnFinalizePurchase();
    await this.selectExperienceType(experienceType);
    await this.clickOnConfirm();
  }
  async reopenVaultWidget() {
    await this.modalContainer.locator(this.closeElementsWidgetButton).click();
    await this.buttonFinalizePurchase.click();
    await this.vaultCheckbox.click();
    await this.clickOnConfirm();
  }

  //Assertions:
}
