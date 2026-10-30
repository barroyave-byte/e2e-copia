import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { MercadoPagoWalletWithExtraParamsProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export const mpWalletPaymentMethods = {
  atm: 'ATM',
  digitalCurrency: 'DigitalCurrency',
  bankTransfer: 'BankTransfer',
  creditCard: 'CreditCard',
  debitCard: 'DebitCard',
  ticket: 'Ticket',
  voucher: 'Voucher',
  cryptoCurrency: 'CryptoCurrency',
} as const;

export class MercadoPagoWalletConnection extends BaseProcessorPage {
  readonly selectIndustry: Locator;
  readonly selectTravels: Locator;
  readonly checkboxATM: Locator;
  readonly checkboxDigitalCurrency: Locator;
  readonly checkboxBankTransfer: Locator;
  readonly checkboxCreditCard: Locator;
  readonly checkboxDebitCard: Locator;
  readonly checkboxTicket: Locator;
  readonly checkboxVoucher: Locator;
  readonly checkboxCryptoCurrency: Locator;
  readonly checkboxBinaryMode: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.selectIndustry = page.getByTestId(
      'connections-configuration-value-select-industry-combobox-container-trigger'
    );
    this.selectTravels = page.getByTestId(
      'connections-configuration-value-select-industry-option-Travels'
    );

    this.checkboxATM = this._createCheckboxConnectionsLocator('checkboxATM');
    this.checkboxDigitalCurrency =
      this._createCheckboxConnectionsLocator('checkboxDigitalCurrency');
    this.checkboxBankTransfer = this._createCheckboxConnectionsLocator('checkboxBankTransfer');
    this.checkboxCreditCard = this._createCheckboxConnectionsLocator('checkboxCreditCard');
    this.checkboxDebitCard = this._createCheckboxConnectionsLocator('checkboxDebitCard');
    this.checkboxTicket = this._createCheckboxConnectionsLocator('checkboxTicket');
    this.checkboxVoucher = this._createCheckboxConnectionsLocator('checkboxVoucher');
    this.checkboxCryptoCurrency = this._createCheckboxConnectionsLocator('checkboxCryptoCurrency');

    this.checkboxBinaryMode = page.getByTestId(
      'connections-configuration-value-checkbox-binary_mode'
    );
  }

  private _createCheckboxConnectionsLocator(
    key: keyof ReturnType<typeof this._getScreenComponentsConnections>
  ): Locator {
    const text = this._getScreenComponentsConnections()[key];
    return this.configurationCheckbox(text);
  }

  _getScreenComponentsConnections() {
    return this.selectors.screenComponentsConnections;
  }

  async selectTravelsIndustry(): Promise<void> {
    console.log(`Selecting Industry ...`);
    await expect(this.selectIndustry, 'The industry select is not visible').toBeVisible();
    await this.selectIndustry.click();
    await expect(this.selectTravels, 'The travels option is not visible').toBeVisible();
    await this.selectTravels.click();
  }

  async configure(
    processorData: MercadoPagoWalletWithExtraParamsProcessor,
    languageCode?: LanguageCodes
  ): Promise<void> {
    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.selectTravelsIndustry();

    await this.fillPrivateKey(processorData.private_api_key);

    const excludePaymentMethods = processorData?.extra_params?.exclude_payment_methods;
    if (excludePaymentMethods) {
      for (const excludePaymentMethod of excludePaymentMethods) {
        const checkboxPropertyName = `checkbox${excludePaymentMethod}`;
        const checkbox = this[checkboxPropertyName];
        await checkbox.scrollIntoViewIfNeeded();
        await expect(checkbox, `The ${excludePaymentMethod} checkbox is not visible`).toBeVisible({
          timeout: 10000,
        });
        await checkbox.click();
      }
    }

    await this.configurationNumberInput('pending').fill(processorData.expirationTime.toString());

    await this.page
      .getByTestId('connections-configuration-value-input-number-processing')
      .fill(processorData.expirationTimeOffline.toString());

    const isBinaryModeEnabled = processorData?.extra_params?.binary_mode;

    if (isBinaryModeEnabled) {
      const checkbox = this.checkboxBinaryMode;
      await checkbox.scrollIntoViewIfNeeded();
      await expect(checkbox, 'The binary mode checkbox is not visible').toBeVisible();
      await checkbox.click();
    }

    await this.clickOnConfigureProcessor();
  }
}
