import { expect, Locator } from '@playwright/test';
import { Page } from '@playwright/test';
import { BaseProcessor, ConnectionProcessorData } from '@support/interfaces/payment_processors';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { CONFIRM_CREATE_CONNECTION_TEST_ID } from './constants';

export interface Processor {
  configure(processorData: ConnectionProcessorData, languageCode?: LanguageCodes): Promise<void>;
}

export abstract class BaseProcessorPage implements Processor {
  protected page: Page;
  readonly selectors: AdminTranslations;
  readonly buttonConnectConfigureProcessor: Locator;
  readonly buttonConfirmCreateConnection: Locator;

  readonly switchAllowSecurityMethod: Locator;
  readonly checkboxAllowDeuna3DS: Locator;
  readonly input3DSAfiliationNumber: Locator;
  readonly input3DSMerchantName: Locator;
  readonly input3DSMerchantCountry: Locator;
  readonly dropdown3DSMerchantCountry: Locator;
  readonly input3DSMerchantURL: Locator;
  readonly input3DSMCC: Locator;
  readonly input3DSVisaAcquirerBIN: Locator;
  readonly input3DSMastercardAcquirerBIN: Locator;
  readonly input3DSAmexAcquirerBIN: Locator;
  readonly input3DSDinersAcquirerBIN: Locator;
  readonly selectCurrency: Locator;
  readonly selectCurrencyOption: (currency: string) => Locator;

  readonly checkboxPSPTokenization: Locator;
  readonly checkboxEnable3DS: Locator;

  readonly inputProcessorName: Locator;
  readonly inputExternalMerchantId: Locator;
  readonly inputPrivateKey: Locator;
  readonly inputPublicKey: Locator;
  readonly inputConfigName: Locator;
  readonly inputConfigAssociationMode: Locator;
  readonly inputConfigExtraParams: Locator;
  readonly inputMerchantId: Locator;
  readonly inputGroupId: Locator;
  readonly inputSignatureKey: Locator;
  readonly inputStoreId: Locator;
  readonly inputAccountId: Locator;
  readonly checkboxDeunaMultiplePartialCapture: Locator;
  readonly inputCutoffDays: Locator;

  readonly checkboxExpressCheckout: Locator;
  readonly selectForex: Locator;
  readonly selectForexCurrency: Locator;
  readonly checkboxPartialRefund: Locator;
  readonly inputPartialRefundCutoffDays: Locator;
  readonly inputExpirationTimeMinutes: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.buttonConnectConfigureProcessor = page.getByTestId('connections-form-button-submit');
    this.buttonConfirmCreateConnection = page.getByTestId(CONFIRM_CREATE_CONNECTION_TEST_ID);
    this.switchAllowSecurityMethod = page.getByTestId('connections-switch-three-ds');
    this.input3DSAfiliationNumber = page.getByTestId(
      'connections-configuration-value-input-text-acquirer_merchant_id'
    );
    this.input3DSMerchantName = page.getByTestId(
      'connections-configuration-value-input-text-merchant_name'
    );
    this.input3DSMerchantCountry = page.getByTestId(
      'connections-configuration-value-input-text-merchant_country'
    );
    this.dropdown3DSMerchantCountry = page.getByTestId(
      'connections-configuration-value-select-merchant_country-combobox-container-trigger'
    );
    this.input3DSMerchantURL = page.getByTestId(
      'connections-configuration-value-input-text-merchant_url'
    );
    this.input3DSMCC = page.getByTestId(
      'connections-configuration-value-input-text-merchant_category_code'
    );
    this.input3DSVisaAcquirerBIN = page.getByTestId(
      'connections-configuration-value-input-text-visa_acquirer_bin'
    );
    this.input3DSMastercardAcquirerBIN = page.getByTestId(
      'connections-configuration-value-input-text-mastercard_acquirer_bin'
    );
    this.input3DSAmexAcquirerBIN = page.getByTestId(
      'connections-configuration-value-input-text-amex_acquirer_bin'
    );
    this.input3DSDinersAcquirerBIN = page.getByTestId(
      'connections-configuration-value-input-text-diners_discover_acquirer_bin'
    );
    this.checkboxPSPTokenization = page.getByTestId(
      'connections-configuration-value-checkbox-tokenize_with_gateway'
    );
    this.selectCurrency = page.getByTestId(
      'connections-configuration-value-select-currency_iso3-combobox-container-trigger'
    );
    this.selectCurrencyOption = (currency: string) =>
      page.getByTestId(`connections-configuration-value-select-currency_iso3-option-${currency}`);
    this.checkboxEnable3DS = page.getByTestId('connections-checkbox-three-ds');
    this.inputProcessorName = page.getByTestId('connections-input-processor-name');
    this.inputExternalMerchantId = page.getByTestId(
      'connections-configuration-value-input-text-external_merchant_id'
    );
    this.inputPrivateKey = page.getByTestId(
      'connections-configuration-value-input-text-private_api_key'
    );
    this.inputPublicKey = page.getByTestId(
      'connections-configuration-value-input-text-public_api_key'
    );
    this.inputSignatureKey = page.getByTestId(
      'connections-configuration-value-input-text-signature_key'
    );
    this.inputConfigName = page.getByTestId('connections-configuration-value-input-text-name');
    this.inputConfigAssociationMode = page.getByTestId(
      'connections-configuration-value-input-text-authorization_association_mode'
    );
    this.inputConfigExtraParams = page.getByTestId(
      'connections-configuration-value-input-text-extra_params'
    );
    this.inputMerchantId = page.getByTestId(
      'connections-configuration-value-input-text-MerchantID'
    );
    this.inputGroupId = page.getByTestId('connections-configuration-value-input-text-group_id');
    this.inputStoreId = page.getByTestId('connections-configuration-value-input-text-store_id');
    this.inputAccountId = page.getByTestId('connections-configuration-value-input-text-account_id');
    this.checkboxDeunaMultiplePartialCapture = page.getByTestId(
      'connections-checkbox-partial-capture-deuna'
    );
    this.inputCutoffDays = page.getByTestId('connections-input-partial-capture-cutoff-days');
    this.checkboxExpressCheckout = page.getByTestId(
      'connections-configuration-value-checkbox-Express Checkout'
    );
    this.selectForex = page.getByTestId('connections-configuration-value-select-forex');
    this.selectForexCurrency = page.getByTestId(
      'connections-configuration-value-select-forex_currency'
    );
    this.checkboxPartialRefund = page.getByTestId('partial-refund-checkbox-deuna');
    this.inputPartialRefundCutoffDays = page.getByTestId('partial-refund-input-cutoff-days');
    this.checkboxAllowDeuna3DS = page.getByTestId('connections-radio-three-ds-deuna');
    this.inputExpirationTimeMinutes = page.getByTestId(
      'connections-configuration-value-input-number-expiration_time_minutes'
    );
  }

  abstract configure(
    processorData: ConnectionProcessorData,
    languageCode?: LanguageCodes
  ): Promise<void>;

  protected configurationTextInput(field: string): Locator {
    return this.page.getByTestId(`connections-configuration-value-input-text-${field}`);
  }

  protected configurationNumberInput(field: string): Locator {
    return this.page.getByTestId(`connections-configuration-value-input-number-${field}`);
  }

  protected configurationCheckbox(field: string): Locator {
    return this.page.getByTestId(`connections-configuration-value-checkbox-${field}`);
  }

  protected configurationOption(field: string, value: string): Locator {
    return this.page.getByTestId(`connections-configuration-value-select-${field}-option-${value}`);
  }

  protected antiFraudInput(field: string): Locator {
    return this.page.getByTestId(`connections-input-antifraud-${field}`);
  }

  protected async fillProcessorName(processorName: string): Promise<void> {
    console.log('Entering processor name to input');
    await this.inputProcessorName.fill(processorName);
  }

  protected async fillExternalMerchantId(externalMerchantId: string): Promise<void> {
    console.log('Entering external merchant id to input');
    await this.inputExternalMerchantId.fill(externalMerchantId);
  }

  protected async fillExpressCheckout(expressCheckout: boolean): Promise<void> {
    console.log('Entering express checkout to input');
    await this.checkboxExpressCheckout.setChecked(expressCheckout);
  }

  protected async fillSignatureKey(signatureKey: string): Promise<void> {
    console.log('Entering signature key to input');
    await this.inputSignatureKey.fill(signatureKey);
  }

  protected async fillPrivateKey(privateKey: string): Promise<void> {
    console.log('Entering private key to input');
    await this.inputPrivateKey.fill(privateKey);
  }

  protected async fillPublicKey(publicKey: string): Promise<void> {
    console.log('Entering public key to input');
    await this.inputPublicKey.fill(publicKey);
  }

  protected async fillConfigName(configName: string): Promise<void> {
    console.log('Entering config name to input');
    await this.inputConfigName.fill(configName);
  }

  protected async fillConfigAssociationMode(configAssociationMode: string): Promise<void> {
    console.log('Entering config association mode to input');
    await this.inputConfigAssociationMode.fill(configAssociationMode);
  }

  protected async fillConfigExtraParams(configExtraParams: string): Promise<void> {
    console.log('Entering config extra params to input');
    await this.inputConfigExtraParams.fill(configExtraParams);
  }

  /**
   * Fills individual extra_params fields using the connections-configuration-value-input-text-[fieldName] pattern
   * @param extraParams Object containing the extra parameters to fill
   */
  protected async fillExtraParamsFields(extraParams: Record<string, any>): Promise<void> {
    for (const [fieldName, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null) {
        const testId = `connections-configuration-value-input-text-${fieldName}`;
        const inputField = this.configurationTextInput(fieldName);

        // Check if the field exists before trying to fill it
        if (await inputField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await inputField.fill(String(value));
        } else {
          console.log(`Field ${testId} not found or not visible, skipping`);
        }
      }
    }
  }

  protected async fillMerchantId(merchantId: string): Promise<void> {
    console.log('Entering merchant id to input');
    await this.inputMerchantId.fill(merchantId);
  }

  protected async fillCutoffDays(cutoffDays: string): Promise<void> {
    console.log('Entering cutoff days to input');
    await this.inputCutoffDays.fill(cutoffDays);
  }

  protected async fillForex(forex: 'direct_forex' | 'reverse_forex'): Promise<void> {
    console.log('Selecting forex');
    await expect(await this.selectForex)
      .toBeVisible({ timeout: 40_000 })
      .then(async () => await this.selectForex.click());

    const forexOption = await this.page.getByTestId(
      `connections-configuration-value-option-${forex}`
    );
    await expect(forexOption)
      .toBeVisible({ timeout: 40_000 })
      .then(async () => await forexOption.click());
  }

  protected async fillForexCurrency(forexCurrency: string): Promise<void> {
    console.log('Selecting forex currency');
    await expect(await this.selectForexCurrency)
      .toBeVisible({ timeout: 5_000 })
      .then(async () => await this.selectForexCurrency.click());

    const forexCurrencyOption = await this.page.getByTestId(
      `connections-configuration-value-option-${forexCurrency}`
    );
    await expect(forexCurrencyOption)
      .toBeVisible({ timeout: 5_000 })
      .then(async () => await forexCurrencyOption.click());
  }

  protected async fillExpirationTimeMinutes(expirationTimeMinutes: number): Promise<void> {
    console.log('Selecting expiration time minutes');
    await expect(await this.inputExpirationTimeMinutes)
      .toBeVisible({ timeout: 5_000 })
      .then(
        async () => await this.inputExpirationTimeMinutes.fill(expirationTimeMinutes.toString())
      );
  }

  /**
   * This method fills the input with the placeholder and the text passed as parameter
   * @param placeholder The placeholder of the input to fill with the text
   * @param text The text to fill in the input
   */
  protected async fillDataInInput({ placeholder, text, options = {} }): Promise<void> {
    const locatorInput = this.page.getByPlaceholder(`${placeholder}`, options);
    await expect(locatorInput, `The input with placeholder ${placeholder} is not visible`)
      .toBeVisible()
      .then(() => locatorInput.fill(text));
  }

  protected getPropertyValue(processorData: BaseProcessor, label: string): string | undefined {
    return processorData.properties.find((property) => property.label === label)?.property_name;
  }

  protected async clickOperationPayment(processorData: BaseProcessor): Promise<void> {
    const testId =
      processorData.automatic_capture === false
        ? 'connections-radio-operation-authorize'
        : 'connections-radio-operation-purchase';
    const radioButton = this.page.getByTestId(testId);
    await expect(radioButton).toBeVisible();
    await radioButton.click();
  }

  protected async clickOperationPaymentIfVisible(processorData: BaseProcessor): Promise<void> {
    const testId =
      processorData.automatic_capture === false
        ? 'connections-radio-operation-authorize'
        : 'connections-radio-operation-purchase';
    const radioButton = this.page.getByTestId(testId);
    if (await radioButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await radioButton.click();
    }
  }

  protected async clickOnConfigureProcessor(): Promise<void> {
    await expect(
      this.buttonConnectConfigureProcessor,
      'The configure connection button is not visible'
    )
      .toBeVisible({ timeout: 5_000 })
      .then(() => this.buttonConnectConfigureProcessor.click());
    await expect(this.buttonConfirmCreateConnection, 'The confirm connection button is not visible')
      .toBeVisible({ timeout: 5_000 })
      .then(() => this.buttonConfirmCreateConnection.click());
  }

  protected async selectCurrencyByCurrency(currency: string): Promise<void> {
    if (await this.selectCurrency.isVisible({ timeout: 3000 })) {
      await this.selectCurrency.click();
      await this.selectCurrencyOption(currency).click();
    }
  }

  private async isField3DSVisible(): Promise<boolean> {
    if (await this.input3DSMerchantCountry.isVisible()) {
      return true;
    }
    if (await this.dropdown3DSMerchantCountry.isVisible()) {
      return true;
    }
    return false;
  }

  private async fill3DSMerchantCountry(processorData: BaseProcessor): Promise<void> {
    if (await this.dropdown3DSMerchantCountry.isVisible()) {
      await this.dropdown3DSMerchantCountry.click();
      await this.page
        .getByTestId(
          `connections-configuration-value-select-merchant_country-option-${processorData.extra_params['merchant_country']}`
        )
        .click();
    } else if (await this.input3DSMerchantCountry.isVisible()) {
      await this.input3DSMerchantCountry.fill(processorData.extra_params['merchant_country']);
    }
  }

  protected async configureDeunaThreeDS(processorData: BaseProcessor): Promise<void> {
    await expect(this.input3DSAfiliationNumber).toBeVisible();
    await this.isField3DSVisible();
    await expect(this.input3DSMerchantName).toBeVisible();
    await expect(this.input3DSMCC).toBeVisible();
    await expect(this.input3DSMerchantURL).toBeVisible();
    await expect(this.input3DSVisaAcquirerBIN).toBeVisible();
    await expect(this.input3DSMastercardAcquirerBIN).toBeVisible();
    await expect(this.input3DSAmexAcquirerBIN).toBeVisible();
    await expect(this.input3DSDinersAcquirerBIN).toBeVisible();

    await this.input3DSAfiliationNumber.fill(processorData.extra_params['merchant_acquirer_id']);
    await this.fill3DSMerchantCountry(processorData);
    await this.input3DSMerchantName.fill(processorData.extra_params['merchant_name']);
    await this.input3DSMCC.fill(processorData.extra_params['merchant_category_code']);
    await this.input3DSMerchantURL.fill(processorData.extra_params['merchant_url']);
    await this.input3DSVisaAcquirerBIN.fill(processorData.extra_params['visa_acquirer_bin']);
    await this.input3DSMastercardAcquirerBIN.fill(
      processorData.extra_params['mastercard_acquirer_bin']
    );
    await this.input3DSAmexAcquirerBIN.fill(processorData.extra_params['amex_acquirer_bin']);
    await this.input3DSDinersAcquirerBIN.fill(
      processorData.extra_params['diners_discover_acquirer_bin']
    );
  }

  protected async togglePSPTokenization(): Promise<void> {
    await expect(this.checkboxPSPTokenization).toBeVisible();
    await this.checkboxPSPTokenization.click();
  }

  protected async toggle3DSAuthentication(): Promise<void> {
    await expect(this.checkboxEnable3DS).toBeVisible();
    await this.checkboxEnable3DS.click();
  }

  async clickOnCheckboxAllowDeuna3DS(): Promise<void> {
    await expect(this.checkboxAllowDeuna3DS).toBeVisible();
    await this.checkboxAllowDeuna3DS.click();
  }

  protected async toggleSecurityMethods(): Promise<void> {
    await expect(this.switchAllowSecurityMethod).toBeVisible();
    await this.switchAllowSecurityMethod.click();
  }

  protected async select3DSProcessorOption(provider: 'deuna' | 'psp'): Promise<void> {
    const testIdMap = {
      deuna: 'connections-radio-three-ds-deuna',
      psp: 'connections-radio-three-ds-psp',
    };
    const radioButton = this.page.getByTestId(testIdMap[provider]);
    await expect(radioButton).toBeVisible();
    await radioButton.click();
  }

  protected async togglePartialRefund(): Promise<void> {
    await expect(this.checkboxPartialRefund).toBeVisible();
    await this.checkboxPartialRefund.click();
  }

  protected async toggleDeunaMultiplePartialCapture(): Promise<void> {
    await expect(this.checkboxDeunaMultiplePartialCapture).toBeVisible();
    await this.checkboxDeunaMultiplePartialCapture.click();
  }

  /**
   * Configures Multiple Partial Capture (MPC) settings based on processor data.
   * This method handles:
   * - Toggling the DeunaMPC checkbox if mode is 'offline'
   * - Filling cutoff days if provided
   *
   * @param processorData The processor configuration data
   */
  protected async configureMultiplePartialCaptureSettings(
    processorData: BaseProcessor
  ): Promise<void> {
    const automaticCapture = processorData?.automatic_capture;
    if (!automaticCapture) {
      if (processorData?.multiple_partial_capture_mode === 'offline') {
        await this.toggleDeunaMultiplePartialCapture();
      }

      const cutoffDays = processorData?.transaction_config?.capture_cutoff_days;
      if (cutoffDays) {
        await this.fillCutoffDays(cutoffDays.toString());
      }
    }
  }
}
