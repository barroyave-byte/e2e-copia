import { CommonsActions } from '@pages/commonActions';
import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import {
  BaseUserAddress,
  BillingFormMap,
  BillingUserAddress,
} from '@support/interfaces/address_user';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

export class ShippingDataPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: CheckoutTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly inputFormsPublicKey: Locator;
  readonly inputFormsOrderToken: Locator;
  readonly selectCheckoutEnvDropdown: Locator;
  readonly selectDeunaNowEnvDropdown: Locator;
  readonly buttonOpenCheckout: Locator;
  readonly labelTitleScreenShippingData: Locator;
  readonly buttonChangeAddress: Locator;
  readonly buttonChangeAddresFromNoCoverageModal: Locator;
  readonly labelCompleteUserData: Locator;
  readonly labelTooltipMustEnterAddress: Locator;
  readonly labelInvalidDniErrorMessage: Locator;
  readonly buttonSaveData: Locator;
  readonly labelTitleAddressWithoutCoverage: Locator;
  readonly labelDescripAddressWithoutCoverage: Locator;
  readonly buttonBackArrow: Locator;
  readonly imageMapsAddress: Locator;
  readonly inputCity: Locator;
  readonly inputApartament: Locator;
  readonly buttonConfirmateAddress: Locator;
  readonly lblDetailsAndConfirmAddress: Locator;
  readonly buttonContinue: Locator;
  readonly cardShipping: Locator;
  readonly buttonAddBillingData: Locator;
  // billing
  readonly inputBillingFirstName: Locator;
  readonly inputBillingLastName: Locator;
  readonly inputBillingEmail: Locator;
  readonly dropdownBillingState: Locator;
  readonly optionECBillingState: Locator;
  readonly dropdownBillingCity: Locator;
  readonly optionECBillingCity: Locator;
  readonly inputBillingZipcode: Locator;
  readonly inputBillingPhone: Locator;
  readonly inputBillingIdentityDocument: Locator;
  readonly labelIdentityDocumentError: Locator;

  responsePromiseAddress: any;
  responsePromiseRegister: any;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('checkout', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.inputFormsPublicKey = this.iframeZoidVisible.locator("input[id='forms-public-key-input']");
    this.inputFormsOrderToken = this.iframeZoidVisible.locator(
      "input[id='forms-order-token-input']"
    );
    this.selectCheckoutEnvDropdown = this.iframeZoidVisible.locator(
      "button[id='checkout-env-dropdown']"
    );
    this.selectDeunaNowEnvDropdown = this.iframeZoidVisible.locator(
      "button[id='deuna-now-env-dropdown']"
    );
    this.buttonOpenCheckout = this.iframeZoidVisible.locator('button:hast-text("Abrir Checkout")');
    this.labelTitleScreenShippingData = this.iframeZoidVisible.locator(
      'p:has-text("Tus datos y domicilio")'
    );
    this.labelInvalidDniErrorMessage = this.iframeZoidVisible.getByText(
      this.selectors.userFormSelectors.labelInvalidDniErrorMessage
    );
    this.buttonChangeAddress = this.iframeZoidVisible
      .locator('section')
      .filter({ hasText: 'Dirección de entrega' })
      .getByTestId('base button');
    this.buttonChangeAddresFromNoCoverageModal = this.iframeZoidVisible.getByRole('button', {
      name: 'Cambiar dirección',
    });
    this.labelCompleteUserData = this.iframeZoidVisible.getByText('Completa tus datos');
    this.labelTooltipMustEnterAddress = this.iframeZoidVisible.getByText(
      'Debes de ingresar una dirección'
    );
    this.buttonSaveData = this.iframeZoidVisible.getByText('Guardar');
    this.buttonBackArrow = this.iframeZoidVisible.locator('[title="Left"]');
    this.imageMapsAddress = this.iframeZoidVisible.locator('[alt="Map Image"]');
    this.labelTitleAddressWithoutCoverage = this.iframeZoidVisible.getByText(
      'Dirección sin cobertura',
      {
        exact: true,
      }
    );
    this.labelDescripAddressWithoutCoverage = this.iframeZoidVisible.getByText(
      'Pronto llegaremos a esta zona.'
    );
    this.inputApartament = this.iframeZoidVisible.locator("input[id='building-type']");
    this.buttonConfirmateAddress = this.iframeZoidVisible.locator(
      `button:has-text("${this.selectors.billingFormSelectors.labelButtonConfirm}")`
    );
    this.inputCity = this.iframeZoidVisible.locator("input[id='city']");
    this.lblDetailsAndConfirmAddress = this.iframeZoidVisible.locator(
      'xpath=//*[contains(text(), "Detalles y confirmación") or contains(text(), "Detalhes e confirmação")]'
    );
    this.buttonContinue = this.iframeZoidVisible.getByText('Continuar', { exact: true });
    this.buttonAddBillingData = this.iframeZoidVisible.locator('#btn-add-billing-data');
    this.inputBillingFirstName = this.iframeZoidVisible.locator('#input-billing-first-name');
    this.inputBillingLastName = this.iframeZoidVisible.locator('#input-billing-last-name');
    this.inputBillingEmail = this.iframeZoidVisible.locator('#input-billing-email');

    this.dropdownBillingState = this.iframeZoidVisible.locator('#dropdown-billing-state');
    this.optionECBillingState = this.dropdownBillingState.getByText('Loja');
    this.dropdownBillingCity = this.iframeZoidVisible.getByTestId('dropdown-input-city');
    this.optionECBillingCity = this.iframeZoidVisible.getByTestId('dropdown-item-Loja');
    this.inputBillingZipcode = this.iframeZoidVisible.locator('#input-billing-zipcode');
    this.inputBillingPhone = this.iframeZoidVisible
      .locator('[id="phone-selector-Teléfono/Celular *"]')
      .or(this.iframeZoidVisible.locator('[data-testid="input-billing-phone-value-input"]')); // migration-or
    this.inputBillingIdentityDocument = this.iframeZoidVisible
      .locator('[data-testid="identity_document-input"]')
      .or(this.iframeZoidVisible.locator('[data-testid="identity_document-value-input"]')); // migration-or
    this.labelIdentityDocumentError = this.iframeZoidVisible.getByText(
      this.selectors.billingFormSelectors.labelIdentityDocumentError
    );
  }

  async clickButtonAddBillingData() {
    await this.ensureVisibleToClick(this.buttonAddBillingData);
  }

  async fillBillingForm({
    firstName,
    lastName,
    email,
    zipcode,
    phone,
    identityDocument,
  }: BillingUserAddress) {
    const inputMap: Record<string, BillingFormMap> = {
      firstName: { locator: this.inputBillingFirstName, value: firstName },
      lastName: { locator: this.inputBillingLastName, value: lastName },
      email: { locator: this.inputBillingEmail, value: email },
      zipcode: { locator: this.inputBillingZipcode, value: zipcode },
      phone: { locator: this.inputBillingPhone, value: phone },
      identityDocument: { locator: this.inputBillingIdentityDocument, value: identityDocument },
    };

    for (const key in inputMap) {
      const { locator, value } = inputMap[key];
      const currentValue = (await locator.inputValue()).trim();
      if (!currentValue || (value && currentValue !== value.trim())) {
        await locator.fill(value);
      }
    }

    await this.dropdownBillingState.click();
    await this.optionECBillingState.last().click();

    await this.dropdownBillingCity.click();
    await this.optionECBillingCity.click();
  }

  async setApartament(apartament: string) {
    await this.page.waitForTimeout(1000);
    await this.inputApartament.fill(apartament);
    await this.page.waitForTimeout(1000);
  }

  async setCity(city: string) {
    await this.page.waitForTimeout(1000);
    await this.inputCity.fill(city);
    await this.page.waitForTimeout(1000);
  }

  async clickOnAddress() {
    await this.page.waitForTimeout(1000);
    const labelButtonChangeAddress = this.iframeZoidVisible.locator(`
      xpath=//*[contains(text(), '${this.selectors.billingFormSelectors.labelButtonChangeAddress}')]
    `);
    const labelAddress = this.iframeZoidVisible.locator(`
      xpath=//*[contains(text(), '${this.selectors.billingFormSelectors.labelAddress}')]
    `);
    const labelButtonAddAddress = this.iframeZoidVisible.locator(`
      xpath=//*[contains(text(), '${this.selectors.billingFormSelectors.labelInputAddress}')]
    `);

    if ((await labelButtonChangeAddress.nth(1).isVisible()) && (await labelAddress.isVisible())) {
      await this.ensureVisibleToClick(labelButtonChangeAddress.nth(1));
    } else {
      await this.ensureVisibleToClick(labelButtonAddAddress.nth(0), undefined, undefined, {
        timeout: 60_000,
      });
    }
  }

  async searchAddress(address: string) {
    const addressInput = this.iframeZoidVisible
      .locator(
        'input[type="text"], input[placeholder*="Ej"], input[placeholder*="Ex"], input[placeholder*="E.g"]'
      )
      .last();

    await addressInput.waitFor({ state: 'visible' });
    await addressInput.fill(address);
    await addressInput.blur();
  }

  async selectAddressFromResults(address: string) {
    await this.page.waitForTimeout(1000);
    const labelAddressFound = this.iframeZoidVisible.locator(`h2:has-text("${address}")`);
    await expect(
      labelAddressFound.first(),
      'The address entered is not visible in the search results'
    ).toBeVisible();
    await labelAddressFound.first().click();
  }

  async selectAndConfirmAddressSearched(address: string) {
    await this.selectAddressFromResults(address);
    await expect(
      this.buttonConfirmateAddress,
      'Button confirm address is not visible'
    ).toBeVisible();
    await this.buttonConfirmateAddress.click();
    await this.page.waitForTimeout(2000);
    await this.buttonConfirmateAddress.click();
    await this.page.waitForTimeout(1000);
  }

  async clickOnContinue() {
    const locatorBntContinue = this.buttonContinue;
    await expect(locatorBntContinue, 'the button continue is not visible')
      .toBeVisible({ timeout: 60_000 })
      .then(() => locatorBntContinue.click());
    await this.page.waitForTimeout(1000);
  }

  async clickOnContinueButton() {
    await this.ensureVisibleToClick(this.buttonContinue);
  }
  async assertUserSeesInvalidDniAlert() {
    expect(this.labelInvalidDniErrorMessage.isVisible());
  }

  async searchAddressAndSelectAndContinue(userAddress: BaseUserAddress) {
    await this.clickOnAddress();
    await this.searchAddress(userAddress.address);
    await this.selectAndConfirmAddressSearched(userAddress.address);
    await this.clickOnContinue();
    await this.page.waitForTimeout(1000);
  }

  async searchAddressAndCompleteInformation(userAddress: BaseUserAddress) {
    await this.clickOnAddress();
    await this.searchAddress(userAddress.address);
    await this.selectAddressFromResults(userAddress.address);
    await this.buttonConfirmateAddress.click();
    if (userAddress.apartament) await this.setApartament(userAddress.apartament);
    if (userAddress.city) await this.setCity(userAddress.city);
    await this.buttonConfirmateAddress.click();
    if (userAddress.city === 'Sao Paulo') await this.buttonConfirmateAddress.click();
    await this.clickOnContinue();
    await this.page.waitForTimeout(1000);
  }

  async searchAndSelectAddressFromModalAddressAndContinue(userAddress: BaseUserAddress) {
    await this.searchAndSelectAddressFromModalAddress(userAddress);
    await this.clickOnContinue();
  }

  async searchAndSelectAddressFromModalAddress(userAddress: BaseUserAddress) {
    await this.searchAddress(userAddress.address);
    await this.selectAndConfirmAddressSearched(userAddress.address);
  }

  async searchAddressAndSelect(userAddress: BaseUserAddress) {
    await this.clickOnAddress();
    await this.searchAddress(userAddress.address);
    await this.selectAndConfirmAddressSearched(userAddress.address);
  }
  async clickOnChangeAddress() {
    await this.ensureVisibleToClick(this.buttonChangeAddress);
  }

  async clickOnUseMyLocation() {
    // TODO: Add data-testid in the UI and migrate this selector — AddressOption
    // (packages/patterns/shipping-address, commons/AddressOption.tsx) receives an
    // `id` prop but only uses it as a React `key`, it is never rendered onto the
    // DOM node, so text is the only selector available today.
    const buttonUseMyLocation = this.iframeZoidVisible.getByText('Mi ubicación actual', {
      exact: true,
    });
    await this.ensureVisibleToClick(buttonUseMyLocation);
  }

  async selectAddressUsingMyLocation() {
    await this.clickOnChangeAddress();
    await this.clickOnUseMyLocation();

    // A single, deterministic confirm-address screen proves the geolocation callback
    // resolved without racing another shipping-address instance. Requires the merchant
    // to be set up via ConfigMerchantCheckout (shipping-rate webhook configured) --
    // otherwise every address, including the geolocation result, surfaces
    // "Dirección sin cobertura" instead of this screen.
    await expect(
      this.buttonConfirmateAddress,
      'Geolocation did not resolve to the confirm-address screen'
    ).toBeVisible({ timeout: 15_000 });

    await this.buttonConfirmateAddress.click();
    await this.page.waitForTimeout(1000);
    // The map step and the details/confirmation step both use the same confirm
    // button copy; click again if it is still visible before continuing.
    if (await this.buttonConfirmateAddress.isVisible()) {
      await this.buttonConfirmateAddress.click();
    }
    await this.clickOnContinue();
  }

  async clickOnChangeAddressFromNoCoverageModal() {
    await this.buttonChangeAddresFromNoCoverageModal.click();
  }

  async clickOnSaveUserData() {
    await this.ensureVisibleToClick(this.buttonSaveData);
  }

  async backToShippingData() {
    await this.buttonBackArrow.click();
  }

  //Assertions

  async assertShippingDataScreenIsVisible() {
    expect(this.labelTitleScreenShippingData.isVisible());
  }

  async assertScreenMissingUserData() {
    expect(this.labelCompleteUserData.isVisible());
  }

  async assertMessageMissingAddress() {
    expect(this.labelTooltipMustEnterAddress.isVisible());
    await this.assertScreenMissingUserData();
  }

  async assertNoCoverageModalIsVisible() {
    expect(this.labelTitleAddressWithoutCoverage.isVisible());
    expect(this.labelDescripAddressWithoutCoverage.isVisible());
  }

  async assertlabelTooltipMustEnterAddressIsVisible() {
    expect(this.labelTooltipMustEnterAddress.isVisible());
  }

  async assertShippingAddressPaymentScreen(address: string) {
    expect(this.imageMapsAddress.isVisible());
    expect(this.iframeZoidVisible.getByText(address).isVisible());
  }

  async assertLabelIdentityDocumentErrorIsVisible() {
    await expect(this.labelIdentityDocumentError).toBeVisible({ timeout: 10000 });
  }
}
