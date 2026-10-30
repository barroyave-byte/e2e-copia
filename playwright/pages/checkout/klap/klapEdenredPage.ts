import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page } from '@playwright/test';

export class KlapEdenredPage extends CommonsActions {
  readonly page: Page;
  readonly inputUsername: Locator;
  readonly inputPassword: Locator;
  readonly buttonLogin: Locator;
  readonly inputPan: Locator;
  readonly buttonValidate: Locator;
  readonly buttonAllow: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.inputUsername = page.locator('#Username');
    this.inputPassword = page.locator('#Password');
    this.buttonLogin = page.locator('#login');
    this.inputPan = page.locator('#inputPan');
    this.buttonValidate = page.getByText('Validar');
    this.buttonAllow = page.getByRole('button', { name: 'Si, permitir' });
  }

  async fillDataToLogin() {
    await this.fillAndVerifyValue(this.inputUsername, '251111154');
    await this.fillAndVerifyValue(this.inputPassword, 'Edenred2022');
  }

  async login() {
    await this.ensureVisibleToClick(this.buttonLogin);
  }

  async fillPan(pan: string = '3560') {
    await this.fillAndVerifyValue(this.inputPan, pan);
  }

  async validatePan() {
    await this.ensureVisibleToClick(this.buttonValidate);
  }

  async allowedKlapToEdenredNetworkMe() {
    await this.ensureVisibleToClick(this.buttonAllow);
  }
}
