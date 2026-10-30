import { expect, Locator, Page } from '@playwright/test';
import { ModalExperienceTypePage } from './modalExperienceTypePage';
import { CommonsActions } from '@pages/commonActions';

const productNameId = {
  shirt: 'Camisa Polo',
  earphones: 'Auriculares',
};

export class EcommercePage extends CommonsActions {
  readonly page: Page;
  readonly divProduct: Locator;
  readonly divProductHeadphones: Locator;
  readonly buttonAddToCart: Locator;
  readonly iconBasket: Locator;
  readonly buttonFinalizePurchase: Locator;
  readonly iconCloseNotification: Locator;
  readonly labelProductUATP: Locator;
  readonly labelProductPayPal: Locator;
  readonly buttonConfirm: Locator;
  readonly buttonContinue: Locator;
  readonly checkoutByStepsContinueButton: Locator;
  readonly inputUserEmail: Locator;
  readonly radioPaymentWidgetModalOption: Locator;
  readonly buttonBackToHome: Locator;
  readonly containerPaymentWidget: Locator;
  readonly navbar: Locator;

  //Locators
  constructor(page: Page) {
    super(page);
    this.page = page;
    this.divProduct = page.locator('div[id="Camisa Polo"]').first();
    this.divProductHeadphones = page.locator('div[id="Auriculares"]').first();
    this.labelProductUATP = page.locator('div[id="Avion UATP card"]').first();
    this.labelProductPayPal = page.getByTestId('product_card_paypal');
    this.buttonAddToCart = page.locator('#add_to_cart_button');
    this.buttonFinalizePurchase = page.locator('#finalize_purchase_button');
    this.iconBasket = page.locator('#shopping_cart_button');
    this.iconCloseNotification = page.getByRole('button', { name: 'Close' });
    this.buttonConfirm = page.locator('#confirm_button');
    this.inputUserEmail = page.locator('#user-email-input');
    this.buttonContinue = page.getByTestId('continue-button');
    this.checkoutByStepsContinueButton = page
      .locator('button[id="base button"]')
      .filter({ hasText: 'Continuar' });
    this.radioPaymentWidgetModalOption = page.getByText('Payment Widget (modal)');
    this.buttonBackToHome = page.getByRole('button', { name: 'Volver al inicio' });
    this.containerPaymentWidget = page.locator('#payment-widget-embed');
    this.navbar = page.getByTestId('navbar');
  }

  //Actions

  async clickOnProduct(product?: string) {
    if (!product) {
      product = 'shirt';
    }

    const productLocator = this.page.locator(`div[id="${productNameId[product]}"]`).first();
    await this.ensureVisibleToClick(productLocator);
  }

  async clickOnProductUATP() {
    await this.ensureVisibleToClick(this.labelProductUATP);
  }
  async clickOnProductPayPal() {
    await this.ensureVisibleToClick(this.labelProductPayPal);
  }

  async addToCart() {
    await this.ensureVisibleToClick(this.buttonAddToCart);
  }

  async clickOnIconBasket() {
    await this.ensureVisibleToClick(this.iconBasket);
  }

  async clickOnFinalizePurchase() {
    await this.ensureVisibleToClick(this.buttonFinalizePurchase);
  }

  async clickOnConfirm() {
    await this.buttonConfirm.click();
  }

  async goToFormsPage() {
    await this.clickOnProduct();
    await this.page.waitForTimeout(500);
    await this.addToCart();
    await this.page.waitForTimeout(500);
    await this.clickOnIconBasket();
    await this.page.waitForTimeout(500);
    const modalExperienceTypePage = new ModalExperienceTypePage(this.page);
    await modalExperienceTypePage.selectExperienceTypeAndConfirm('Formularios');
    await this.page.waitForTimeout(500);
  }

  async goToCheckoutInStepsPage() {
    await this.clickOnProduct();
    await this.addToCart();
    await this.clickOnIconBasket();
    const modalExperienceTypePage = new ModalExperienceTypePage(this.page);
    await modalExperienceTypePage.selectExperienceTypeAndConfirm('Checkout en Pasos');
  }

  async fillUserEmail(userEmail: string) {
    await this.inputUserEmail.fill(userEmail);
  }

  async clickOnContinue() {
    await this.buttonContinue.click();
  }

  async clickOnCheckoutByStepsContinueButton() {
    await this.checkoutByStepsContinueButton.click();
  }

  async selectPaymentWidgetModalOption() {
    await this.radioPaymentWidgetModalOption.click();
  }

  async assertBackToHomeButtonIsVisible() {
    await expect(this.buttonBackToHome).toBeVisible();
  }

  async assertRejectedPaymentHeadingIsVisible() {
    await expect(
      this.page.getByRole('heading', { name: 'Pago rechazado', exact: true })
    ).toBeVisible({ timeout: 20_000 });
  }

  async ensurePaymentWidgetContainerVisible() {
    // scroll to the container
    await this.containerPaymentWidget.evaluate((el) => el.scrollIntoView());
    await this.containerPaymentWidget.waitFor({ state: 'visible' });
  }

  async hideNavbar() {
    await this.navbar.evaluate((el) => (el.style.display = 'none'));
  }

  //Assertions:
}
