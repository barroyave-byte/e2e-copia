import { expect, type Locator, type Page } from '@playwright/test';
import type {
  BaseProcessor,
  ConnectionProcessorData,
  BazGatewayDeUna3DSProcessor,
  MercadoPagoWalletProcessor,
} from '@support/interfaces/payment_processors';
import { ProcessorRegistry } from '@pages/admin/connections/connectionRegistry';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { getTranslations } from '@support/translations/getTranslations';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import type { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { CommonsActions } from '@pages/commonActions';
import { slugifyForDataTestIdSegment } from '@pages/admin/utils/stringUtils';
import envConfig from '@support/envConfig';
import { CONFIRM_CREATE_CONNECTION_TEST_ID } from './constants';

const CONNECTIONS_UI_TIMEOUT = 30_000;

// Use this map to override connection names for searching
// For example, if you want to search for "Stripe Direct" as "Stripe", you can do so here.
// if the name is not found in this map, it will use the original connection name.
const SEARCH_NAME = {
  [ConnectionsAvailable.stripeDirect]: 'Stripe',
} as const;

export class AdminConnectionsPage extends CommonsActions {
  readonly page: Page;
  readonly languageCode: LanguageCodes;
  readonly selectors: AdminTranslations;
  readonly comboboxOpenProcessorType: Locator;
  readonly inputSearchConnection: Locator;
  readonly iconCheck: Locator;
  readonly successToast: Locator;
  readonly stripeConnectionPendingModal: Locator;
  readonly stripeConnectionPendingConfirmButton: Locator;
  readonly buttonCloseSuccessMsg: Locator;
  readonly buttonConnectionsActive: Locator;
  readonly buttonConnectionsDisabled: Locator;
  readonly buttonConnectionsPending: Locator;
  readonly discoverErrorState: Locator;
  readonly connectionsTableErrorState: Locator;
  readonly connectionFormNotFoundState: Locator;
  readonly buttonWalletFirstOptions: Locator;
  readonly buttonEditConnection: Locator;
  readonly inputProcessorName: Locator;
  readonly inputMerchantId: Locator;
  readonly inputMerchantName: Locator;
  readonly inputMerchantCountry: Locator;
  readonly inputMerchantUrl: Locator;
  readonly inputMerchantCategoryCode: Locator;
  readonly inputVisaAcquirerBin: Locator;
  readonly inputMastercardAcquirerBin: Locator;
  readonly buttonConfirmEditProcessor: Locator;
  readonly buttonSubmitConnection: Locator;
  readonly buttonCancelEditProcessor: Locator;
  readonly buttonDisableConnection: Locator;
  readonly buttonEnableConnection: Locator;
  readonly inputEnvironment: Locator;
  readonly inputApiKey: Locator;
  readonly inputPublicKey: Locator;
  readonly inputPrivateKey: Locator;
  readonly inputAccountId: Locator;
  readonly inputDomain: Locator;
  readonly selectFraudProcessorOption: Locator;
  readonly buttonProcessorOptions: Locator;
  readonly selectEditProcessorOption: Locator;
  readonly switchAllowSecurityMethod: Locator;
  readonly checkboxAllowDeuna3DS: Locator;
  readonly inputExpirationTime: Locator;
  readonly inputExpirationTimeOffline: Locator;
  readonly checkboxBinaryMode: Locator;
  readonly input3dsMerchantId: Locator;
  readonly input3dsMerchantName: Locator;
  readonly input3dsMerchantCountry: Locator;
  readonly input3dsMerchantUrl: Locator;
  readonly input3dsMerchantCategoryCode: Locator;
  readonly input3dsConfigVisaAcquirerBin: Locator;
  readonly input3dsConfigMastercardAcquirerBin: Locator;
  readonly inputConfigNumberPending: Locator;
  readonly inputConfigNumberProcessing: Locator;
  readonly switchProcessorAvs: Locator;
  readonly checkboxPartialRefund: Locator;
  readonly inputPartialRefundCutoffDays: Locator;
  readonly checkboxDeunaMultiplePartialCapture: Locator;
  readonly inputCutoffDays: Locator;
  readonly checkboxVaulting: Locator;
  readonly buttonSaveConnection: Locator;
  readonly radioCredentialFlowMerchantManaged: Locator;
  readonly radioCredentialFlowDeunaManaged: Locator;
  readonly inputWalletMerchantId: Locator;
  readonly inputMerchantDomain: Locator;
  readonly buttonAddMerchantDomain: Locator;
  readonly inputWalletPublicKey: Locator;
  readonly inputWalletPrivateKey: Locator;
  readonly inputWalletTlsPublicKey: Locator;
  readonly inputWalletTlsPrivateKey: Locator;
  readonly checkboxConfigurationValueFor: (label: string) => Locator;
  readonly buttonConfirmCreateConnectionDialog: Locator;
  readonly connectionAvailableFor: (connectionName: string) => Locator;
  readonly googlePayGatewaySelect: Locator;
  readonly googlePayDeunaGatewayOption: Locator;
  readonly merchantDomainValueFor: (domain: string) => Locator;
  readonly discoverRetryButton: Locator;
  readonly connectionsTableRetryButton: Locator;
  readonly connectionFormTitleFor: (title: string) => Locator;
  readonly connectionFormDescriptionFor: (description: string) => Locator;
  readonly connectionFormContainer: Locator;
  readonly pendingProcessorRowFor: (connectionName: string) => Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.languageCode = languageCode;
    this.selectors = getTranslations('admin', languageCode);
    this.inputSearchConnection = page.getByTestId('connections-input-search');
    this.iconCheck = page.getByTestId('connections-modal-icon-check');
    this.successToast = page.getByTestId(/^connections-toast-(created|updated)$/).first();
    this.stripeConnectionPendingModal = page.getByTestId('connections-modal-connection-dialog');
    this.stripeConnectionPendingConfirmButton = page.getByTestId(
      'connections-modal-connection-confirm-button'
    );
    this.buttonCloseSuccessMsg = page.getByTestId('connections-modal-connection-cancel-button');
    this.buttonConnectionsActive = page.getByTestId('connections-filter-tab-enabled');
    this.buttonConnectionsDisabled = page.getByTestId('connections-filter-tab-disabled');
    this.buttonConnectionsPending = page.getByTestId('connections-filter-tab-pending');
    this.discoverErrorState = page.getByTestId('connections-discover-error');
    this.connectionsTableErrorState = page.getByTestId('connections-table-error');
    this.connectionFormNotFoundState = page.getByTestId('connections-form-state-not-found');

    this.inputMerchantId = this.page.getByTestId(
      'connections-configuration-value-input-text-acquirer_merchant_id'
    );
    this.inputMerchantName = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_name'
    );
    this.inputMerchantCountry = this.page.getByTestId(
      'connections-configuration-value-select-merchant_country'
    );
    this.inputMerchantUrl = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_url'
    );
    this.inputMerchantCategoryCode = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_category_code'
    );
    this.inputVisaAcquirerBin = this.page.getByTestId(
      'connections-configuration-value-input-text-visa_acquirer_bin'
    );
    this.inputMastercardAcquirerBin = this.page.getByTestId(
      'connections-configuration-value-input-text-mastercard_acquirer_bin'
    );
    this.comboboxOpenProcessorType = page.getByTestId('connections-filters-processor-type');
    this.selectFraudProcessorOption = page.getByTestId(
      'connections-filters-processor-type-option-afm'
    );
    this.buttonProcessorOptions = page.getByTestId(/^connections-table-dropdown-/).first();

    this.buttonWalletFirstOptions = page.getByTestId(/^connections-table-dropdown-/).first();

    this.selectEditProcessorOption = page.getByTestId('connections-table-dropdown-option-edit');

    this.buttonEditConnection = page.getByTestId('connections-table-dropdown-option-edit');
    this.inputProcessorName = page.getByTestId('connections-input-processor-name');
    this.buttonConfirmEditProcessor = page.getByTestId(
      'connections-dialog-update-connection-confirm-button'
    );
    this.buttonSubmitConnection = page.getByTestId('connections-form-button-submit');
    this.buttonCancelEditProcessor = page.getByTestId('connections-form-button-cancel');
    this.buttonDisableConnection = page.getByTestId(
      'connections-table-dropdown-option-disableConnection'
    );
    this.buttonEnableConnection = page.getByTestId(
      'connections-table-dropdown-option-enableConnection'
    );
    this.inputEnvironment = page.getByTestId('connections-configuration-value-input-env');
    this.inputApiKey = page.getByTestId('connections-configuration-value-input-text-api_key');
    this.inputPublicKey = page.getByTestId(
      'connections-configuration-value-input-text-public_api_key'
    );
    this.inputPrivateKey = page.getByTestId(
      'connections-configuration-value-input-text-private_api_key'
    );
    this.inputAccountId = page.getByTestId('connections-configuration-value-input-text-account_id');
    this.inputDomain = page.getByTestId('connections-configuration-value-input-domain');
    this.switchAllowSecurityMethod = page.getByTestId('connections-switch-three-ds');
    this.checkboxAllowDeuna3DS = page.getByTestId('connections-radio-three-ds-deuna');
    this.inputExpirationTime = page.getByTestId(
      'connections-configuration-value-input-number-pending'
    );
    this.inputExpirationTimeOffline = page.getByTestId(
      'connections-configuration-value-input-number-processing'
    );
    this.checkboxBinaryMode = page.getByTestId(
      'connections-configuration-value-checkbox-binary_mode'
    );
    this.input3dsMerchantId = this.page.getByTestId(
      'connections-configuration-value-input-text-acquirer_merchant_id'
    );
    this.input3dsMerchantName = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_name'
    );
    this.input3dsMerchantCountry = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_country'
    );
    this.input3dsMerchantUrl = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_url'
    );
    this.input3dsMerchantCategoryCode = this.page.getByTestId(
      'connections-configuration-value-input-text-merchant_category_code'
    );
    this.input3dsConfigVisaAcquirerBin = this.page.getByTestId(
      'connections-configuration-value-input-text-visa_acquirer_bin'
    );
    this.input3dsConfigMastercardAcquirerBin = this.page.getByTestId(
      'connections-configuration-value-input-text-mastercard_acquirer_bin'
    );
    this.inputConfigNumberPending = this.page.getByTestId(
      'connections-configuration-value-input-number-pending'
    );
    this.inputConfigNumberProcessing = this.page.getByTestId(
      'connections-configuration-value-input-number-processing'
    );
    this.switchProcessorAvs = this.page.getByTestId('connections-switch-avs');
    this.checkboxPartialRefund = this.page.getByTestId('partial-refund-checkbox-deuna');
    this.inputPartialRefundCutoffDays = this.page.getByTestId('partial-refund-input-cutoff-days');
    this.checkboxDeunaMultiplePartialCapture = page.getByTestId(
      'connections-checkbox-partial-capture-deuna'
    );
    this.inputCutoffDays = page.getByTestId('connections-input-partial-capture-cutoff-days');
    this.checkboxVaulting = this.page.getByTestId(
      'connections-configuration-value-checkbox-use_consent'
    );
    this.buttonSaveConnection = this.page.getByTestId('connections-form-button-submit');
    this.radioCredentialFlowMerchantManaged = page.getByTestId(
      'connections-radio-option-credential_flow-merchant_managed'
    );
    this.radioCredentialFlowDeunaManaged = page.getByTestId(
      'connections-radio-option-credential_flow-deuna_managed'
    );
    this.inputWalletMerchantId = page.getByTestId(
      'connections-configuration-value-input-text-wallet_merchant_id'
    );
    this.inputMerchantDomain = page.getByTestId(
      'connections-configuration-value-list-input-merchant_domains'
    );
    this.buttonAddMerchantDomain = page.getByTestId(
      'connections-configuration-value-list-add-merchant_domains'
    );
    this.inputWalletPublicKey = page.getByTestId(
      'connections-configuration-value-input-text-public_key'
    );
    this.inputWalletPrivateKey = page.getByTestId(
      'connections-configuration-value-input-text-private_key'
    );
    this.inputWalletTlsPublicKey = page.getByTestId(
      'connections-configuration-value-input-text-tls_public_key'
    );
    this.inputWalletTlsPrivateKey = page.getByTestId(
      'connections-configuration-value-input-text-tls_private_key'
    );
    this.checkboxConfigurationValueFor = (label) =>
      page.getByTestId(`connections-configuration-value-checkbox-${label}`);
    this.buttonConfirmCreateConnectionDialog = page.getByTestId(CONFIRM_CREATE_CONNECTION_TEST_ID);
    this.connectionAvailableFor = (connectionName) =>
      page.getByTestId(`connections-button-connect-${connectionName}`);
    this.googlePayGatewaySelect = page.getByTestId(
      'connections-configuration-value-select-gateway-combobox-container-trigger'
    );
    // Admin replaced the former DIRECT option with "deuna"; the testid carries that value.
    this.googlePayDeunaGatewayOption = page.getByTestId(
      'connections-configuration-value-select-gateway-option-deuna'
    );
    this.merchantDomainValueFor = (domain) => page.getByText(domain, { exact: true });
    this.discoverRetryButton = this.discoverErrorState.getByRole('button');
    this.connectionsTableRetryButton = this.connectionsTableErrorState.getByRole('button');
    this.connectionFormTitleFor = (title) =>
      this.connectionFormNotFoundState.getByText(title, { exact: true });
    this.connectionFormDescriptionFor = (description) =>
      this.connectionFormNotFoundState.getByText(description, { exact: true });
    this.connectionFormContainer = page.getByTestId('connections-form-page-container');
    this.pendingProcessorRowFor = (connectionName) =>
      page.getByTestId(/^connections-table-row-/).filter({
        has: page.getByTestId(
          `connections-table-cell-name-${slugifyForDataTestIdSegment(connectionName)}`
        ),
      });
  }

  async selectConnection(connectionName: string) {
    const connection = SEARCH_NAME[connectionName] || connectionName;

    const connectionLocator = this.page.getByTestId(`connections-button-connect-${connection}`);

    await connectionLocator.first().waitFor({ state: 'visible', timeout: 30000 });
    const count = await connectionLocator.count();
    const targetLocator = count > 1 ? connectionLocator.nth(1) : connectionLocator;

    await targetLocator.click();
  }

  async selectCredentialFlow(mode: 'merchant_managed' | 'deuna_managed'): Promise<void> {
    const radio =
      mode === 'merchant_managed'
        ? this.radioCredentialFlowMerchantManaged
        : this.radioCredentialFlowDeunaManaged;
    await expect(radio, `The "${mode}" credential flow option is not visible`).toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await radio.click();
  }

  async fillMerchantName(name: string): Promise<void> {
    await expect(this.inputMerchantName, 'The merchant name input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await this.inputMerchantName.fill(name);
  }

  async fillWalletMerchantId(id: string): Promise<void> {
    await expect(
      this.inputWalletMerchantId,
      'The wallet merchant id input is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.inputWalletMerchantId.fill(id);
  }

  async addMerchantDomain(domain: string): Promise<void> {
    await expect(this.inputMerchantDomain, 'The merchant domain input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await this.inputMerchantDomain.fill(domain);
    await expect(
      this.buttonAddMerchantDomain,
      'The "Agregar dominio" button is not enabled'
    ).toBeEnabled({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.buttonAddMerchantDomain.click();
  }

  async selectConfigurationCheckbox(label: string): Promise<void> {
    const checkbox = this.checkboxConfigurationValueFor(label);
    await expect(checkbox, `The "${label}" checkbox is not visible`).toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await checkbox.click();
  }

  async selectGooglePayDeunaGateway(): Promise<void> {
    await expect(this.googlePayGatewaySelect, 'The gateway select is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await this.googlePayGatewaySelect.click();
    await expect(
      this.googlePayDeunaGatewayOption,
      'The DEUNA gateway option is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.googlePayDeunaGatewayOption.click();
  }

  async assertApplePayInitialConfiguration(): Promise<void> {
    await expect(
      this.radioCredentialFlowMerchantManaged,
      'Merchant-managed credentials are selected before the user chooses a flow'
    ).not.toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(
      this.radioCredentialFlowDeunaManaged,
      'DEUNA-managed credentials are selected before the user chooses a flow'
    ).not.toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });

    for (const [locator, field] of [
      [this.inputMerchantName, 'merchant name'],
      [this.inputWalletMerchantId, 'wallet merchant id'],
      [this.inputMerchantDomain, 'merchant domain'],
    ] as const) {
      await expect(locator, `The ${field} field is not visible`).toBeVisible({
        timeout: CONNECTIONS_UI_TIMEOUT,
      });
    }

    for (const label of ['Visa', 'Mastercard', 'American Express', 'Discover', '3DS']) {
      await expect(
        this.checkboxConfigurationValueFor(label),
        `The "${label}" checkbox is not visible`
      ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    }
  }

  async assertGooglePayMerchantManagedFieldsVisible(): Promise<void> {
    await expect(
      this.inputWalletMerchantId,
      'The wallet merchant id input is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(this.inputWalletPublicKey, 'The public key input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(this.inputWalletPrivateKey, 'The private key input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
  }

  async assertGooglePayMerchantManagedFieldsHidden(): Promise<void> {
    await expect(
      this.inputWalletMerchantId,
      'The wallet merchant id input is still visible'
    ).toBeHidden({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(this.inputWalletPublicKey, 'The public key input is still visible').toBeHidden({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(this.inputWalletPrivateKey, 'The private key input is still visible').toBeHidden({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
  }

  async saveEditedConnection(): Promise<void> {
    await this.confirmEditProcessor();
    await this.assertConnectionConfigured();
    await this.waitForSuccessToastToDisappear();
  }

  async assertGooglePayConfiguration(merchantName: string, checkedLabels: string[]): Promise<void> {
    await expect(
      this.radioCredentialFlowDeunaManaged,
      'The DEUNA-managed credential flow is not selected'
    ).toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(this.inputMerchantName, 'The edited merchant name was not persisted').toHaveValue(
      merchantName,
      { timeout: CONNECTIONS_UI_TIMEOUT }
    );
    for (const label of checkedLabels) {
      await expect(
        this.checkboxConfigurationValueFor(label),
        `The "${label}" checkbox is not checked`
      ).toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });
    }
  }

  async assertApplePayConfiguration(
    merchantName: string,
    checkedLabels: string[],
    merchantDomain: string
  ): Promise<void> {
    await expect(
      this.radioCredentialFlowDeunaManaged,
      'The DEUNA-managed credential flow is not selected'
    ).toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(this.inputMerchantName, 'The edited merchant name was not persisted').toHaveValue(
      merchantName,
      { timeout: CONNECTIONS_UI_TIMEOUT }
    );
    for (const label of checkedLabels) {
      await expect(
        this.checkboxConfigurationValueFor(label),
        `The "${label}" checkbox is not checked`
      ).toBeChecked({ timeout: CONNECTIONS_UI_TIMEOUT });
    }
    await expect(
      this.merchantDomainValueFor(merchantDomain),
      `The merchant domain "${merchantDomain}" was not persisted`
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertMerchantManagedFieldsVisible(): Promise<void> {
    await expect(this.inputWalletPublicKey, 'The public key input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(this.inputWalletPrivateKey, 'The private key input is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(
      this.inputWalletTlsPublicKey,
      'The TLS public key input is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(
      this.inputWalletTlsPrivateKey,
      'The TLS private key input is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertMerchantManagedFieldsHidden(): Promise<void> {
    await expect(this.inputWalletPublicKey, 'The public key input is still visible').toBeHidden({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(this.inputWalletPrivateKey, 'The private key input is still visible').toBeHidden({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(
      this.inputWalletTlsPublicKey,
      'The TLS public key input is still visible'
    ).toBeHidden({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(
      this.inputWalletTlsPrivateKey,
      'The TLS private key input is still visible'
    ).toBeHidden({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async submitCreateConnectionForm(): Promise<void> {
    await expect(this.buttonSubmitConnection, 'The submit button is not visible').toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await this.buttonSubmitConnection.click();
  }

  /**
   * Creating a wallet/processor connection opens a second, generic confirmation dialog
   * (BaseDialog, dataTestIdScope="connections-dialog-create-connection") after the form's own
   * submit button — confirmed via admin-ff's generateBaseDialogDataTestIds ("{scope}-confirm-button").
   * Wallet creation feedbackOptions set showSuccessModal:false, so there is no success toast —
   * confirming success means asserting the connection later shows up in "Activos", not a toast.
   */
  async confirmCreateConnectionDialog(): Promise<void> {
    await expect(
      this.buttonConfirmCreateConnectionDialog,
      'The create-connection confirmation dialog button is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.buttonConfirmCreateConnectionDialog.click();
  }

  async selectProcessorType(processorType: string) {
    const typeValueMap: Record<string, string> = {
      fraud: 'afm',
      all_types: 'ALL',
      payment_gateway: 'psp',
      alternative_payment_method: 'apm',
    };
    await this.clickOnListProcessorTypes();
    await this.clickOnOptionProcessorType(typeValueMap[processorType] || processorType);
  }

  async clickOnOptionProcessorType(processorTypeValue: string) {
    const optionLocator = this.page.getByTestId(
      `connections-filters-processor-type-option-${processorTypeValue}`
    );
    await expect(optionLocator, 'The processor type option is not visible in the dropdown list')
      .toBeVisible()
      .then(() => optionLocator.click());
  }

  async clickOnListProcessorTypes() {
    await expect(this.comboboxOpenProcessorType, 'The dropdown list processor types is not visible')
      .toBeVisible({
        timeout: 1000,
      })
      .then(() => this.comboboxOpenProcessorType.click());
    await this.page.waitForTimeout(1000);
  }

  async clickOnFraudProcessorOption() {
    await expect(this.selectFraudProcessorOption, 'The fraud processor option is not visible')
      .toBeVisible({
        timeout: 2500,
      })
      .then(() => this.selectFraudProcessorOption.click());
  }

  async clickOnButtonOptionsProcessor() {
    await expect(this.buttonProcessorOptions, 'The  processor option is not visible')
      .toBeVisible({ timeout: 30000 })
      .then(() => this.buttonProcessorOptions.click());
  }

  async clickOnListActiveProcessors() {
    await this.page.waitForTimeout(4000);
    await this.clickOnConnectionsActive();
  }

  async clickOnConnectionsActive() {
    await this.ensureVisibleToClick(this.buttonConnectionsActive);
  }

  async clickOnConnectionsDisabledTab() {
    await this.ensureVisibleToClick(this.buttonConnectionsDisabled);
  }

  async clickOnConnectionsPendingTab() {
    await this.ensureVisibleToClick(this.buttonConnectionsPending);
  }

  async assertDiscoverErrorVisible(): Promise<void> {
    await expect(
      this.discoverErrorState,
      'The Descubrir tab error state is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertDiscoverErrorHidden(): Promise<void> {
    await expect(
      this.discoverErrorState,
      'The Descubrir tab error state is still visible'
    ).toBeHidden({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  /**
   * The PageState retry button has no data-testid of its own (only the error container does) —
   * confirmed live, not guessed. Scope to the container and match its only button.
   * TODO: Add a data-testid to the retry button itself in admin-ff and migrate this selector.
   */
  async clickRetryOnDiscoverError(): Promise<void> {
    await expect(
      this.discoverRetryButton,
      'The Descubrir tab error retry button is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.discoverRetryButton.click();
  }

  async assertConnectionAvailable(connectionName: string): Promise<void> {
    await expect(
      this.connectionAvailableFor(connectionName),
      `The "${connectionName}" connection is not available after retry`
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertConnectionsTableErrorVisible(): Promise<void> {
    await expect(
      this.connectionsTableErrorState,
      'The connections table error state is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertConnectionsTableErrorHidden(): Promise<void> {
    await expect(
      this.connectionsTableErrorState,
      'The connections table error state is still visible'
    ).toBeHidden({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async clickRetryOnConnectionsTableError(): Promise<void> {
    await expect(
      this.connectionsTableRetryButton,
      'The connections table retry button is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await this.connectionsTableRetryButton.click();
  }

  async goToProcessorEditRoute(resourceKey: string): Promise<void> {
    await this.page.goto(
      `${envConfig.ADMIN_URL}/connections/edit/processor/${encodeURIComponent(resourceKey)}?returnTab=enabled`,
      { waitUntil: 'domcontentloaded' }
    );
  }

  async goToProcessorCreateRoute(providerId: string): Promise<void> {
    await this.page.goto(
      `${envConfig.ADMIN_URL}/connections/create/processor/${encodeURIComponent(providerId)}?returnTab=discover`,
      { waitUntil: 'domcontentloaded' }
    );
  }

  async assertConnectionFormNotFoundState(title: string, description: string): Promise<void> {
    await expect(
      this.connectionFormNotFoundState,
      'The connection form not-found state is not visible'
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(
      this.connectionFormTitleFor(title),
      `The not-found title "${title}" is not visible`
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(
      this.connectionFormDescriptionFor(description),
      `The not-found guidance "${description}" is not visible`
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
    await expect(this.connectionFormContainer, 'The connection form is still visible').toBeHidden({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
  }

  async clickOnProcessorOptions() {
    await expect(this.buttonProcessorOptions, 'The processor options are not avaible')
      .toBeVisible({ timeout: 30000 })
      .then(() => this.buttonProcessorOptions.click());
  }

  async clickOnWalletFirstOptions() {
    await expect(
      this.buttonWalletFirstOptions,
      'The wallet payment options are not avaible'
    ).toBeVisible({ timeout: 50000 });
    await this.buttonWalletFirstOptions.click();
  }

  async clickOnEditProcessorOption() {
    await expect(this.selectEditProcessorOption, 'The edit processor option is not visible')
      .toBeVisible()
      .then(() => this.selectEditProcessorOption.click());
  }

  async clickOnEditProcessor() {
    await expect(this.buttonEditConnection, 'The processor option to edit is not avaible')
      .toBeVisible()
      .then(() => this.buttonEditConnection.click());
  }

  async editProcessorName(name: string) {
    await this.inputProcessorName.fill(name);
    await this.confirmEditProcessor();
  }

  async waitForEditProcessorResponse(responsePath = 'stores/all/processors') {
    await this.page.waitForResponse(
      (response) => response.url().includes(responsePath) && response.status() === 200,
      {
        timeout: 15000,
      }
    );
  }

  async editProcessorOperation(operation: string) {
    const operationRadio = this.page.getByTestId(
      `connections-radio-operation-${operation.toLowerCase()}`
    );
    await expect(operationRadio, 'The operation is not visible').toBeVisible();
    await operationRadio.click();
  }

  async confirmEditProcessor() {
    await expect(this.buttonSubmitConnection, 'The submit button is not visible')
      .toBeVisible()
      .then(() => this.buttonSubmitConnection.click());
    await expect(this.buttonConfirmEditProcessor, 'The confirm button is not visible')
      .toBeVisible()
      .then(() => this.buttonConfirmEditProcessor.click());
  }

  async cancelEditProcessor() {
    await expect(
      this.buttonCancelEditProcessor,
      'The cancel edit button is not visible'
    ).toBeVisible();
    await this.buttonCancelEditProcessor.click();
    await expect(this.buttonConnectionsActive).toBeVisible();
  }

  async clickOnDisableProcessor() {
    await expect(this.buttonDisableConnection, 'The processor option to disable is not avaible')
      .toBeVisible()
      .then(() => this.buttonDisableConnection.click());
  }

  async clickOnEnableProcessor() {
    await expect(this.buttonEnableConnection, 'The processor option to enable is not avaible')
      .toBeVisible()
      .then(() => this.buttonEnableConnection.click());
  }

  /**
   * Disabling/enabling a connection goes straight to the generic ModalConnection confirmation
   * dialog (BaseDialog, dataTestIdScope="connections-modal-connection") -- there is no
   * intermediate form/submit step, unlike editing a connection's config. Do not reuse
   * confirmEditProcessor() for this: its two-step (submit + dialog) assumption doesn't match
   * the disable/enable flow.
   */
  private async confirmConnectionActionModal(errorMessage: string): Promise<void> {
    const buttonConfirmModal = this.page.getByTestId('connections-modal-connection-confirm-button');
    await expect(buttonConfirmModal, errorMessage).toBeVisible();
    await buttonConfirmModal.click();
  }

  async confirmDisableConnectionModal(): Promise<void> {
    await this.confirmConnectionActionModal(
      'The disable-connection confirmation modal button is not visible'
    );
  }

  async confirmEnableConnectionModal(): Promise<void> {
    await this.confirmConnectionActionModal(
      'The enable-connection confirmation modal button is not visible'
    );
  }

  async disableConnection(closeSuccessModal = false): Promise<void> {
    await this.clickOnConnectionsActive();
    await this.clickOnButtonOptionsProcessor();
    await this.clickOnDisableProcessor();
    await this.confirmDisableConnectionModal();
    if (closeSuccessModal) await this.clickOnCloseSuccessMsg();
  }

  async enableConnection(closeSuccessModal = false): Promise<void> {
    await this.clickOnConnectionsDisabledTab();
    await this.clickOnButtonOptionsProcessor();
    await this.clickOnEnableProcessor();
    await this.confirmEnableConnectionModal();
    if (closeSuccessModal) await this.clickOnCloseSuccessMsg();
  }

  async searchConnection(connectionName: string, processorType?: string): Promise<void> {
    if (processorType === 'fraud') {
      await this.selectProcessorType(processorType);
    }

    const connectionNameToSearch = SEARCH_NAME[connectionName] || connectionName;

    await expect(this.inputSearchConnection, 'The search input is not visible')
      .toBeVisible()
      .then(() => this.inputSearchConnection.fill(connectionNameToSearch));
  }

  async clickOnOptionsButtonProcessors() {
    await expect(this.buttonProcessorOptions, 'The edit button is not visible').toBeVisible();
    await this.buttonProcessorOptions.click();
  }

  async clickOnActiveProcessorsTab() {
    await expect(this.buttonConnectionsActive, 'The list of active connectios is not visible')
      .toBeVisible()
      .then(() => this.buttonConnectionsActive.click());
  }

  async assertProcessorAdded(connectionName: string): Promise<void> {
    console.log('Validating that the PSP processor is added');
    await expect(
      this.getProcessorCellName(connectionName),
      `The "${connectionName}" connection is not visible`
    ).toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertProcessorNotAdded(connectionName: string): Promise<void> {
    console.log('Validating that the PSP processor is not added');
    await expect(
      this.getProcessorCellName(connectionName),
      `The "${connectionName}" connection is still visible`
    ).not.toBeVisible({ timeout: CONNECTIONS_UI_TIMEOUT });
  }

  async assertPendingProcessor(connectionName: string): Promise<void> {
    const row = this.pendingProcessorRowFor(connectionName);

    await expect(row, `The pending "${connectionName}" connection is not visible`).toBeVisible({
      timeout: CONNECTIONS_UI_TIMEOUT,
    });
    await expect(row, `The "${connectionName}" connection is not pending`).toContainText(
      this.selectors.paymentStatusSelectors.pending,
      { timeout: CONNECTIONS_UI_TIMEOUT }
    );
  }

  private getProcessorCellName(connectionName: string): Locator {
    return this.page.getByTestId(
      `connections-table-cell-name-${slugifyForDataTestIdSegment(connectionName)}`
    );
  }

  async configureConnection(
    connectionName: ConnectionsAvailable,
    processorData: ConnectionProcessorData,
    processorType?: string
  ) {
    await this.searchConnection(connectionName, processorType);
    await this.page.waitForTimeout(1500);
    await this.selectConnection(connectionName);
    await this.page.waitForTimeout(1500);
    const processor = ProcessorRegistry.getProcessor(this.page, this.languageCode, connectionName);

    await processor.configure(processorData, this.languageCode);

    if (connectionName === ConnectionsAvailable.stripe) {
      await this.assertStripeConnectionPendingAndClose();
      return;
    }

    await this.assertConnectionConfigured();
  }

  async clickOnSwitchAllowSecurityMethod(): Promise<void> {
    await expect(this.switchAllowSecurityMethod).toBeVisible();
    await this.switchAllowSecurityMethod.click();
  }

  async clickOnCheckboxAllowDeuna3DS(): Promise<void> {
    await expect(this.checkboxAllowDeuna3DS).toBeVisible();
    await this.checkboxAllowDeuna3DS.click();
  }

  async configureDeUna3DS(processorData: BazGatewayDeUna3DSProcessor) {
    await this.clickOnSwitchAllowSecurityMethod();
    await this.clickOnCheckboxAllowDeuna3DS();

    await expect(this.input3dsMerchantId, `The input is not visible`).toBeVisible();
    await this.input3dsMerchantId.fill(processorData.merchant_id);

    await expect(this.input3dsMerchantName, `The input is not visible`).toBeVisible();
    await this.input3dsMerchantName.fill(processorData.merchant_name);

    await expect(this.input3dsMerchantCountry, `The input is not visible`).toBeVisible();
    await this.input3dsMerchantCountry.fill(processorData.merchant_country);

    await expect(this.input3dsMerchantUrl, `The input is not visible`).toBeVisible();
    await this.input3dsMerchantUrl.fill(processorData.merchant_url);

    await expect(this.input3dsMerchantCategoryCode, `The input is not visible`).toBeVisible();
    await this.input3dsMerchantCategoryCode.fill(processorData.merchant_category_code);

    await expect(this.input3dsConfigVisaAcquirerBin, `The input is not visible`).toBeVisible();
    await this.input3dsConfigVisaAcquirerBin.fill(processorData.visa_acquirer_bin);

    await expect(
      this.input3dsConfigMastercardAcquirerBin,
      `The input is not visible`
    ).toBeVisible();
    await this.input3dsConfigMastercardAcquirerBin.fill(processorData.mastercard_acquirer_bin);

    await this.confirmEditProcessor();
  }

  async configureMercadoPagoWallet(processorData: MercadoPagoWalletProcessor) {
    await expect(this.inputConfigNumberPending, `The input is not visible`).toBeVisible();
    await this.inputConfigNumberPending.fill(processorData.expirationTime.toString());

    await expect(this.inputConfigNumberProcessing, `The input is not visible`).toBeVisible();
    await this.inputConfigNumberProcessing.fill(processorData.expirationTimeOffline.toString());

    await expect(this.checkboxBinaryMode, 'The binary mode checkbox is not visible').toBeVisible();
    await this.checkboxBinaryMode.click();

    await this.confirmEditProcessor();
  }

  async configureDeUnaMultiplePartialRefund(processorData: BaseProcessor) {
    await this.configureMultiplePartialRefundSettingsForEdit(processorData, false);
    await this.finalizeConnectionEdit();
  }

  private async fillCutoffDaysIfNeeded(processorData: BaseProcessor): Promise<void> {
    const cutoffDays = processorData?.transaction_config?.capture_cutoff_days;
    if (cutoffDays) {
      await expect(this.inputCutoffDays).toBeVisible();
      await this.inputCutoffDays.fill(cutoffDays.toString());
    }
  }

  /**
   * Configures Multiple Partial Refund (MPR) settings for connection editing.
   * This method handles:
   * - Toggling the Partial Refund checkbox (when includeMultiplePartialRefundToggle is true)
   * - Filling refund cutoff days
   *
   * @param processorData The processor configuration data
   * @param includeMultiplePartialRefundToggle Whether to toggle the MultiplePartialRefund checkbox
   */
  private async configureMultiplePartialRefundSettingsForEdit(
    processorData: BaseProcessor,
    includeMultiplePartialRefundToggle: boolean
  ): Promise<void> {
    if (includeMultiplePartialRefundToggle) {
      await expect(this.checkboxPartialRefund).toBeVisible();
      await this.checkboxPartialRefund.click();
    }

    await this.fillRefundCutoffDaysIfNeeded(processorData);
  }

  private async fillRefundCutoffDaysIfNeeded(processorData: BaseProcessor): Promise<void> {
    const cutoffDays = processorData?.transaction_config?.refund_cutoff_days;
    if (cutoffDays !== undefined) {
      await expect(this.inputPartialRefundCutoffDays).toBeVisible();
      await this.inputPartialRefundCutoffDays.fill(cutoffDays.toString());
    }
  }

  async configureDeUnaMultiplePartialCapture(processorData: BaseProcessor) {
    await this.configureMultiplePartialCaptureSettingsForEdit(processorData, true);
    await this.finalizeConnectionEdit();
  }

  async updateCutOffMultiplePartialCapture(processorData: BaseProcessor) {
    await this.configureMultiplePartialCaptureSettingsForEdit(processorData, false);
    await this.finalizeConnectionEdit();
  }

  /**
   * Configures Multiple Partial Capture (MPC) settings for connection editing.
   * This method handles:
   * - Toggling the DeunaMultiplePartialCapture checkbox if mode is 'offline' (when includeMultiplePartialCaptureToggle is true)
   * - Filling cutoff days if provided
   *
   * @param processorData The processor configuration data
   * @param includeMultiplePartialCaptureToggle Whether to toggle the MultiplePartialCapture checkbox
   */
  private async configureMultiplePartialCaptureSettingsForEdit(
    processorData: BaseProcessor,
    includeMultiplePartialCaptureToggle: boolean
  ): Promise<void> {
    const automaticCapture = processorData?.automatic_capture;
    if (!automaticCapture) {
      if (
        includeMultiplePartialCaptureToggle &&
        processorData?.multiple_partial_capture_mode === 'offline'
      ) {
        await expect(this.checkboxDeunaMultiplePartialCapture).toBeVisible();
        await this.checkboxDeunaMultiplePartialCapture.click();
      }

      await this.fillCutoffDaysIfNeeded(processorData);
    }
  }

  private async finalizeConnectionEdit(): Promise<void> {
    await this.confirmEditProcessor();
  }

  async updateCutOffMultiplePartialRefund(processorData: BaseProcessor) {
    await this.configureMultiplePartialRefundSettingsForEdit(processorData, false);
    await this.finalizeConnectionEdit();
  }

  async clickOnVaultingCheckbox() {
    await this.ensureVisibleToClick(this.checkboxVaulting);
  }

  async clickOnSaveConnection() {
    await this.ensureVisibleToClick(this.buttonSaveConnection);
  }

  async clickOnConfirmSaveConnection() {
    await this.confirmEditProcessor();
  }

  // Assertions:
  async assertConnectionConfigured(): Promise<void> {
    await expect(this.successToast, 'The connection success toast is not visible').toBeVisible({
      timeout: 30000,
    });
  }

  private async assertStripeConnectionPendingAndClose(): Promise<void> {
    await expect(
      this.stripeConnectionPendingModal,
      'The Stripe connection pending modal is not visible'
    ).toBeVisible({ timeout: 30_000 });

    await this.stripeConnectionPendingConfirmButton.click();
    await expect(this.stripeConnectionPendingModal).toBeHidden();
  }

  /**
   * The success toast (Sonner, top-right, 5s auto-dismiss duration) overlaps the AppShell
   * topbar's notification bell. Wait it out before interacting with the bell, same as a
   * real user would, instead of racing it.
   */
  async waitForSuccessToastToDisappear(): Promise<void> {
    await expect(this.successToast, 'The success toast is still covering the screen').toBeHidden({
      timeout: 8000,
    });
  }

  async clickOnCloseSuccessMsg(): Promise<void> {
    await expect(this.buttonCloseSuccessMsg).toBeVisible();
    await this.buttonCloseSuccessMsg.click();
  }

  private getAntiFraudPropertyInput(label: string): Locator {
    return this.page.getByPlaceholder(label, { exact: true });
  }

  async getAntiFraudPropertyValue(label: string): Promise<string> {
    const input = this.getAntiFraudPropertyInput(label);
    await expect(input, `The ${label} anti-fraud input is not visible`).toBeVisible();
    return input.inputValue();
  }

  async focusAntiFraudProperty(label: string): Promise<void> {
    const input = this.getAntiFraudPropertyInput(label);
    await expect(input, `The ${label} anti-fraud input is not visible`).toBeVisible();
    await input.focus();
  }

  async fillAntiFraudProperty(label: string, value: string): Promise<void> {
    const input = this.getAntiFraudPropertyInput(label);
    await expect(input, `The ${label} anti-fraud input is not visible`).toBeVisible();
    await input.fill(value);
  }

  async assertAntiFraudPropertyValue(label: string, value: string): Promise<void> {
    await expect(this.getAntiFraudPropertyInput(label)).toHaveValue(value);
  }

  async assertAntiFraudCredentialIsMasked(label: string): Promise<void> {
    await expect(this.getAntiFraudPropertyInput(label)).toHaveValue(/\*{4,}/);
  }

  async assertSelectedProcessorTypeInputs(): Promise<void> {
    // Check which fraud processor type form is displayed by checking testid visibility
    if (await this.inputPublicKey.isVisible()) {
      await this.assertVisibleInputsEditFraudProcessorType1();
    } else if (await this.inputAccountId.isVisible()) {
      await this.assertVisibleInputsEditFraudProcessorType2();
    } else if (await this.inputDomain.isVisible()) {
      await this.assertVisibleInputsEditFraudProcessorType5();
    }
  }

  async assertVisibleInputsEditFraudProcessorType1(): Promise<void> {
    await expect(this.inputPublicKey, 'The public key input is not visible').toBeVisible();
    await expect(this.inputPrivateKey, 'The private key input is not visible').toBeVisible();
  }

  async assertVisibleInputsEditFraudProcessorType2(): Promise<void> {
    await expect(this.inputAccountId, 'The public key input is not visible').toBeVisible();
    await expect(this.inputApiKey, 'The private key input is not visible').toBeVisible();
  }

  async assertVisibleInputsEditFraudProcessorType5(): Promise<void> {
    await expect(this.inputDomain, 'The env input is not visible').toBeVisible();
    await expect(this.inputEnvironment, 'The InputEditProcessor is not visible').toBeVisible();
    await expect(this.inputApiKey, 'The InputEditProcessor is not visible').toBeVisible();
  }

  async assert3DSInfoSaved(processor: BazGatewayDeUna3DSProcessor) {
    await expect(this.inputMerchantId).toHaveValue(processor.merchant_id);
    await expect(this.inputMerchantName).toHaveValue(processor.merchant_name);
    await expect(this.input3dsMerchantCountry).toHaveValue(processor.merchant_country);
    await expect(this.inputMerchantUrl).toHaveValue(processor.merchant_url);
    await expect(this.inputMerchantCategoryCode).toHaveValue(processor.merchant_category_code);
    await expect(this.inputVisaAcquirerBin).toHaveValue(processor.visa_acquirer_bin);
    await expect(this.inputMastercardAcquirerBin).toHaveValue(processor.mastercard_acquirer_bin);
  }

  async assertMercadoPagoWalletInfoSaved(processor: MercadoPagoWalletProcessor) {
    await expect(this.inputExpirationTime).toHaveValue(processor.expirationTime.toString());
    await expect(this.inputExpirationTimeOffline).toHaveValue(
      processor.expirationTimeOffline.toString()
    );
    await expect(this.checkboxBinaryMode).not.toBeChecked();
  }

  async verifyAvsSwitchNotVisible(): Promise<void> {
    await expect(this.switchProcessorAvs).not.toBeVisible();
  }

  async verifyAvsSwitchIsVisible(): Promise<void> {
    await expect(this.switchProcessorAvs).toBeVisible();
  }

  async activateAvsSwitch(): Promise<void> {
    await expect(this.switchProcessorAvs).toBeVisible();
    await this.switchProcessorAvs.click();
    await expect(this.switchProcessorAvs).toBeChecked();
  }

  async verifyAvsSwitchIsChecked(): Promise<void> {
    await expect(this.switchProcessorAvs).toBeChecked();
  }

  async verifyAvsSwitchIsNotChecked(): Promise<void> {
    await expect(this.switchProcessorAvs).not.toBeChecked();
  }

  /**
   * Opens the processor configuration drawer by navigating through the connections UI.
   *
   * @precondition At least one active connection must exist in the connections list.
   * @precondition The processor options button must be visible and clickable.
   * @precondition The "Edit" option must be available in the processor options menu.
   *
   * @throws Will fail if no active connections are available or if any UI element is not accessible.
   */
  async openProcessorDrawer(): Promise<void> {
    await this.clickOnConnectionsActive();
    await this.clickOnButtonOptionsProcessor();
    await this.clickOnEditProcessorOption();
  }

  async closeDrawer(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Asserts that Multiple Partial Refund (MPR) settings are correctly saved.
   * Verifies:
   * - Partial Refund checkbox is checked
   * - Refund cutoff days value matches the processor configuration (if provided)
   *
   * @param processor The processor configuration to validate against
   */
  async assertDeUnaMultiplePartialRefundInfoSaved(processor: BaseProcessor) {
    await expect(this.checkboxPartialRefund).toBeChecked();
    const cutoffDays = processor?.transaction_config?.refund_cutoff_days;
    if (cutoffDays !== undefined) {
      await expect(this.inputPartialRefundCutoffDays).toHaveValue(cutoffDays.toString());
    }
  }

  async assertDeUnaMultiplePartialCaptureInfoSaved(processor: BaseProcessor) {
    await expect(this.checkboxDeunaMultiplePartialCapture).toBeChecked();

    const cutoffDays = processor?.transaction_config?.capture_cutoff_days;
    if (cutoffDays !== undefined) {
      await expect(this.inputCutoffDays).toHaveValue(cutoffDays.toString());
    }
  }
}
