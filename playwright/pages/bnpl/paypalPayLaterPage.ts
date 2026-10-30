import { Locator, Page } from '@deuna/test';
import { CommonsActions } from '@pages/commonActions';

export class PaypalPayLaterPage extends CommonsActions {
  readonly page: Page;

  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly buttonNext: Locator;
  readonly buttonLogin: Locator;
  readonly buttonCard: Locator;
  readonly buttonPay: Locator;

  /* Locators */
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.inputEmail = this.page.locator('#email');
    this.inputPassword = this.page.locator('#password');
    // PayPal serves either the classic login (#btnNext/#btnLogin) or the new /pay app.
    this.buttonNext = this.page
      .locator('button[data-atomic-wait-task="login_enter_email"]')
      .or(this.page.locator('#btnNext'));
    this.buttonLogin = this.page
      .locator('button[data-atomic-wait-task="login_with_password"]')
      .or(this.page.locator('#btnLogin'));
    this.buttonCard = this.page.getByTestId('first-fis').locator(':scope > *').first();
    this.buttonPay = this.page.getByTestId('submit-button-initial');
  }

  /* Actions */
  async login() {
    const email = 'sb-yex4j49919156@personal.example.com';
    const password = '6vg?AQ:1';

    await this.inputEmail.fill(email);
    await this.ensureVisibleToClick(this.buttonNext);
    await this.inputPassword.fill(password);
    await this.ensureVisibleToClick(this.buttonLogin);
  }

  async selectCard() {
    await this.ensureVisibleToClick(this.buttonCard);
  }

  async pay() {
    await this.ensureVisibleToClick(this.buttonPay);
  }
}
