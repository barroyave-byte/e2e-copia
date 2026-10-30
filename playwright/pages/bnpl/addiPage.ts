import { expect, Page, Locator } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { AddiTranslations } from '@support/translations/selectors/explore/addi/addiTranslation';

export enum AddiRedirectPageFlow {
  error,
  decline,
  approve,
}

export class AddiRedirectPage extends CommonsActions {
  readonly page: Page;
  popupClosed: Promise<unknown>;

  // Locators como propiedades de la clase
  private labelAddiTitle: Locator;
  private pseButtonLocator: Locator;
  private paymentFormLocator: Locator;
  private bankSelectorLocator: Locator;
  private inputNameLocator: Locator;
  private inputIdsNumberLocator: Locator;
  private inputEmailLocator: Locator;
  private payButtonLocator: Locator;
  private cancelButtonLocator: Locator;
  private exitButtonLocator: Locator;
  private buttonApproveBankLocator: Locator;
  private buttonDeclineBankLocator: Locator;
  private buttonErrorBankLocator: Locator;
  private continueBtn: Locator;


  private selectors: AddiTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/addi', languageCode);

    // Inicialización de locators
    this.labelAddiTitle = this.page.locator(
      `h1:has-text("${this.selectors.screenAddiForm.labelEnterYourData}")`
    );

    this.pseButtonLocator = this.page.locator(
      `text=${this.selectors.screenAddiForm.buttonDebitWithPSE}`
    );
    this.paymentFormLocator = this.page.locator('#pse-payment-form');
    this.bankSelectorLocator = this.page.locator('#bank-selector');
    this.inputNameLocator = this.page.locator(
      `input[placeholder="${this.selectors.screenAddiForm.placeholderFullName}"]`
    );
    this.inputIdsNumberLocator = this.page.locator('#ids-number input').nth(0);
    this.inputEmailLocator = this.page.locator(
      `input[placeholder="${this.selectors.screenAddiForm.placeholderEmail}"]`
    );
    this.payButtonLocator = this.page.getByRole('button', {
      name: this.selectors.screenAddiForm.buttonPayWithPSE,
    });
    this.cancelButtonLocator = this.page.locator('button i[name="e90b"]');
    this.exitButtonLocator = this.page.getByRole('button', {
      name: this.selectors.screenAddiForm.buttonExit,
    });
    this.buttonApproveBankLocator = this.page.getByText(/Banco que aprueba/i);
    this.buttonDeclineBankLocator = this.page.getByText(/Banco que declina/i);
    this.buttonErrorBankLocator = this.page.getByText(/Banco que simula un error/i);
    this.popupClosed = new Promise((resolve) => {
      this.page.on('close', resolve);
    });
    this.continueBtn = this.page.getByRole('button', { name: /continuar/i });
  }

  async assertAddiPage() {
    // Wait for the external page to fully load
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });

    await expect(this.labelAddiTitle, 'Addi landing page is not visible').toBeVisible({ timeout: 60000 });
  }

  async selectDebitWithPSE() {
    if (this.page.isClosed()) {
      throw new Error('Popup page was closed unexpectedly');
    }

    await this.page.waitForLoadState('domcontentloaded');

    // Addi added an identity verification step before PSE selection
    const continueBtn = this.page.getByRole('button', { name: /continuar/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
    }

    await expect(this.pseButtonLocator).toBeVisible({ timeout: 120000 });
    await this.pseButtonLocator.click();
  }

  async assertPaymentFormMustBeVisible() {
    await expect(this.paymentFormLocator, 'AddiChallenge: Payment form is not visible').toBeVisible({ timeout: 50000 });
  }

  async waitForClose(timeout = 60_000) {
    await Promise.race([
      this.popupClosed,
      this.page.waitForTimeout(timeout).then(() => {
        if (!this.page.isClosed()) {
          throw new Error(`Popup did not close within ${timeout}ms`);
        }
      })
    ])
  }

  async selectApproveBank() {
    await this.bankSelectorLocator.click();
    await this.buttonApproveBankLocator.click();
  }

  async selectDeclineBank() {
    await this.bankSelectorLocator.click();
    await this.buttonDeclineBankLocator.click();
  }

  async selectErrorBank() {
    await this.bankSelectorLocator.click();
    await this.buttonErrorBankLocator.click();
  }

  async fillUserData() {
    await this.inputNameLocator.fill('John Doe');
    await this.inputIdsNumberLocator.fill('3211234567');
    await this.inputEmailLocator.fill('test@test.com');
  }

  async sendPayment() {
    await this.payButtonLocator.click();
  }

  async cancelPurchase() {
    await this.page.waitForLoadState('domcontentloaded');
    // Addi added an identity verification step before the cancel flow
    if (await this.continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.continueBtn.click();
    }
    await this.cancelButtonLocator.click();
    await this.exitButtonLocator.click();
  }
}
