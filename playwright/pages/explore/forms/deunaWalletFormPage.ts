import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from './formHelpers';

export class DeunaWalletFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormDeunaWallet: Locator;
  readonly buttonEmbedDesktop: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    // The Formularios payment methods list currently renders two option cards
    // with the same id (duplicate entry in explore-deuna's AvailablePaymentMethodsList).
    this.optionFormDeunaWallet = page.locator('#payment_method_deuna_wallet').first();
    this.buttonEmbedDesktop = page
      .getByTestId('embed-button-desktop')
      .or(page.getByRole('button', { name: 'Embedir Pago' }))
      .first();
  }

  async selectDeunaWalletForm() {
    await this.optionFormDeunaWallet.scrollIntoViewIfNeeded();
    await this.ensureVisibleToClick(this.optionFormDeunaWallet);
    await expect(
      this.buttonEmbedDesktop,
      'embed button should be visible after selecting Deuna Wallet'
    ).toBeVisible();
    await this.buttonEmbedDesktop.scrollIntoViewIfNeeded();
    await this.ensureVisibleToClick(this.buttonEmbedDesktop);
  }
}
