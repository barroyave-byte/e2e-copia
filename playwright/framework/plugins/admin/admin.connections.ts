import { Context, FrameworkPlugin } from '../interface';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import type {
  BaseProcessor,
  BazGatewayDeUna3DSProcessor,
  MercadoPagoWalletProcessor,
} from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import envConfig from '@support/envConfig';
import type { Response } from '@playwright/test';

interface WalletCredentialResponse {
  id?: string;
  data?: { id?: string };
}

export class PluginAdminConnections extends FrameworkPlugin {
  pluginBaseName = 'admin.connections';

  connectionsPage!: AdminConnectionsPage;
  private walletCredentialResponse?: Promise<WalletCredentialResponse>;
  private walletCredentialResponseHandler?: (response: Response) => void;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.connectionsPage = new AdminConnectionsPage(context.page);
  }

  /** @description Searches for a connection by name in the connections list. Optionally filters by processor type (e.g. "fraud") before searching. */
  async $tf_searchConnection({
    connectionName,
    processorType,
  }: {
    connectionName: string;
    processorType?: string;
  }) {
    await this.connectionsPage.searchConnection(connectionName, processorType);
  }

  /** @description Clicks the connect button for the given connection name to begin adding that connection. */
  async $tf_selectConnection({ connectionName }: { connectionName: string }) {
    await this.connectionsPage.selectConnection(connectionName);
  }

  /** @description Opens the processor type dropdown and selects the given type (e.g. "fraud", "payment_gateway", "alternative_payment_method"). */
  async $tf_selectProcessorType({ processorType }: { processorType: string }) {
    await this.connectionsPage.selectProcessorType(processorType);
  }

  /** @description Searches for a connection, selects it, fills in all processor configuration fields, and asserts that the connection was successfully configured. */
  async $tf_configureConnection({
    connectionName,
    processorData,
    processorType,
  }: {
    connectionName: ConnectionsAvailable;
    processorData: BaseProcessor;
    processorType?: string;
  }) {
    await this.connectionsPage.configureConnection(connectionName, processorData, processorType);
  }

  /** @description Enables the 3DS security method, selects the DeUna 3DS option, and fills in all required 3DS merchant configuration fields, then saves. */
  async $tf_configureDeUna3DS({ processorData }: { processorData: BazGatewayDeUna3DSProcessor }) {
    await this.connectionsPage.configureDeUna3DS(processorData);
  }

  /** @description Fills in the MercadoPago wallet expiration time fields, toggles binary mode, and confirms the processor edit. */
  async $tf_configureMercadoPagoWallet({
    processorData,
  }: {
    processorData: MercadoPagoWalletProcessor;
  }) {
    await this.connectionsPage.configureMercadoPagoWallet(processorData);
  }

  /** @description Configures the DeUna multiple partial refund settings (refund cutoff days) and finalizes the connection edit. */
  async $tf_configureMultiplePartialRefund({ processorData }: { processorData: BaseProcessor }) {
    await this.connectionsPage.configureDeUnaMultiplePartialRefund(processorData);
  }

  /** @description Toggles the DeUna multiple partial capture checkbox (when mode is "offline"), fills in cutoff days if provided, and finalizes the connection edit. */
  async $tf_configureMultiplePartialCapture({ processorData }: { processorData: BaseProcessor }) {
    await this.connectionsPage.configureDeUnaMultiplePartialCapture(processorData);
  }

  /** @description Updates the cutoff days for multiple partial capture without toggling the checkbox, then finalizes the connection edit. */
  async $tf_updateCutOffMultiplePartialCapture({
    processorData,
  }: {
    processorData: BaseProcessor;
  }) {
    await this.connectionsPage.updateCutOffMultiplePartialCapture(processorData);
  }

  /** @description Updates the cutoff days for multiple partial refund without toggling the checkbox, then finalizes the connection edit. */
  async $tf_updateCutOffMultiplePartialRefund({ processorData }: { processorData: BaseProcessor }) {
    await this.connectionsPage.updateCutOffMultiplePartialRefund(processorData);
  }

  /** @description Clicks the vaulting checkbox in the connection configuration drawer. */
  async $tf_clickVaultingCheckbox() {
    await this.connectionsPage.clickOnVaultingCheckbox();
  }

  /** @description Clicks the allow security method (3DS) switch toggle in the connection configuration. */
  async $tf_clickSwitchAllowSecurityMethod() {
    await this.connectionsPage.clickOnSwitchAllowSecurityMethod();
  }

  /** @description Clicks the checkbox to select DeUna as the 3DS provider in the connection configuration. */
  async $tf_clickCheckboxAllowDeuna3DS() {
    await this.connectionsPage.clickOnCheckboxAllowDeuna3DS();
  }

  /** @description Opens the processor configuration drawer by navigating to active connections, clicking the options button, and selecting the edit option. */
  async $tf_openProcessorDrawer() {
    await this.connectionsPage.openProcessorDrawer();
  }

  /** @description Closes the currently open processor configuration drawer by pressing the Escape key. */
  async $tf_closeDrawer() {
    await this.connectionsPage.closeDrawer();
  }

  /** @description Asserts that a connection was successfully configured by verifying the success checkmark icon is visible, then closes the success modal. */
  async $tf_assertConnectionConfigured() {
    await this.connectionsPage.assertConnectionConfigured();
  }

  /** @description Asserts that all 3DS merchant configuration fields (merchant ID, name, country, URL, category code, Visa and Mastercard acquirer bins) are saved with the expected values. */
  async $tf_assert3DSInfoSaved({ processor }: { processor: BazGatewayDeUna3DSProcessor }) {
    await this.connectionsPage.assert3DSInfoSaved(processor);
  }

  /** @description Opens the "Activos" (enabled) connections tab. */
  async $tf_goToActiveConnectionsTab() {
    await this.connectionsPage.clickOnConnectionsActive();
  }

  /** @description Opens the "Deshabilitados" (disabled) connections tab. */
  async $tf_goToDisabledConnectionsTab() {
    await this.connectionsPage.clickOnConnectionsDisabledTab();
  }

  /** @description Opens the "Pendientes" (pending) connections tab. */
  async $tf_goToPendingConnectionsTab() {
    await this.connectionsPage.clickOnConnectionsPendingTab();
  }

  /** @description From the "Activos" tab, opens the first connection's row menu, clicks "Deshabilitar" and confirms the disable-connection modal. */
  async $tf_disableConnection({ closeSuccessModal = false }: { closeSuccessModal?: boolean } = {}) {
    await this.connectionsPage.disableConnection(closeSuccessModal);
  }

  /** @description From the "Deshabilitados" tab, opens the first connection's row menu, clicks "Habilitar" and confirms the enable-connection modal. */
  async $tf_enableConnection({ closeSuccessModal = false }: { closeSuccessModal?: boolean } = {}) {
    await this.connectionsPage.enableConnection(closeSuccessModal);
  }

  /** @description Asserts that a connection with the given name is visible in the currently active connections tab. */
  async $tf_assertProcessorAdded({ connectionName }: { connectionName: string }) {
    await this.connectionsPage.assertProcessorAdded(connectionName);
  }

  /** @description Asserts that a connection with the given name is not visible in the currently active connections tab. */
  async $tf_assertProcessorNotAdded({ connectionName }: { connectionName: string }) {
    await this.connectionsPage.assertProcessorNotAdded(connectionName);
  }

  /** @description Asserts that the named connection is visible with pending status in the current tab. */
  async $tf_assertPendingProcessor({ connectionName }: { connectionName: string }) {
    await this.connectionsPage.assertPendingProcessor(connectionName);
  }

  /** @description Asserts that the Descubrir tab's error state (shown when the processor catalog fails to load) is visible. */
  async $tf_assertDiscoverErrorVisible() {
    await this.connectionsPage.assertDiscoverErrorVisible();
  }

  /** @description Asserts that the Descubrir tab's error state is no longer visible. */
  async $tf_assertDiscoverErrorHidden() {
    await this.connectionsPage.assertDiscoverErrorHidden();
  }

  /** @description Asserts that a named connection card is visible in the Descubrir catalog. */
  async $tf_assertConnectionAvailable({ connectionName }: { connectionName: string }) {
    await this.connectionsPage.assertConnectionAvailable(connectionName);
  }

  /** @description Clicks the retry button inside the Descubrir tab's error state to refetch the processor catalog. */
  async $tf_clickRetryOnDiscoverError() {
    await this.connectionsPage.clickRetryOnDiscoverError();
  }

  /** @description Asserts that the connections table's error state is visible. */
  async $tf_assertConnectionsTableErrorVisible() {
    await this.connectionsPage.assertConnectionsTableErrorVisible();
  }

  /** @description Asserts that the connections table's error state is no longer visible. */
  async $tf_assertConnectionsTableErrorHidden() {
    await this.connectionsPage.assertConnectionsTableErrorHidden();
  }

  /** @description Clicks the retry button inside the connections table's error state. */
  async $tf_clickRetryOnConnectionsTableError() {
    await this.connectionsPage.clickRetryOnConnectionsTableError();
  }

  /** @description Opens a processor connection edit route using the supplied resource key. */
  async $tf_goToProcessorEditRoute({ resourceKey }: { resourceKey: string }) {
    await this.connectionsPage.goToProcessorEditRoute(resourceKey);
  }

  /** @description Opens the processor create route for the provided catalog provider ID. */
  async $tf_goToProcessorCreateRoute({ providerId }: { providerId: string }) {
    await this.connectionsPage.goToProcessorCreateRoute(providerId);
  }

  /** @description Asserts that the connection form not-found state shows the expected title and the form is hidden. */
  async $tf_assertConnectionFormNotFoundState({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) {
    await this.connectionsPage.assertConnectionFormNotFoundState(title, description);
  }

  /** @description Selects the credential flow radio option ("merchant_managed" or "deuna_managed") in a wallet's create/edit connection form. */
  async $tf_selectCredentialFlow({ mode }: { mode: 'merchant_managed' | 'deuna_managed' }) {
    await this.connectionsPage.selectCredentialFlow(mode);
  }

  /** @description Asserts the untouched Apple Pay form shows its base fields and no preselected credential flow. */
  async $tf_assertApplePayInitialConfiguration() {
    await this.connectionsPage.assertApplePayInitialConfiguration();
  }

  /** @description Fills the merchant name field in the create/edit connection form. */
  async $tf_fillMerchantName({ name }: { name: string }) {
    await this.connectionsPage.fillMerchantName(name);
  }

  /** @description Fills the wallet merchant id field in a wallet's create/edit connection form. */
  async $tf_fillWalletMerchantId({ id }: { id: string }) {
    await this.connectionsPage.fillWalletMerchantId(id);
  }

  /** @description Fills a merchant domain into the domain list input and clicks "Agregar dominio" to add it. */
  async $tf_addMerchantDomain({ domain }: { domain: string }) {
    await this.connectionsPage.addMerchantDomain(domain);
  }

  /** @description Clicks a configuration value checkbox identified by its visible label (e.g. a card network or an authentication method). */
  async $tf_selectConfigurationCheckbox({ label }: { label: string }) {
    await this.connectionsPage.selectConfigurationCheckbox(label);
  }

  /** @description Selects the DEUNA gateway in the Google Pay configuration form. */
  async $tf_selectGooglePayDeunaGateway() {
    await this.connectionsPage.selectGooglePayDeunaGateway();
  }

  /** @description Asserts that Google Pay's merchant-managed credential fields are visible. */
  async $tf_assertGooglePayMerchantManagedFieldsVisible() {
    await this.connectionsPage.assertGooglePayMerchantManagedFieldsVisible();
  }

  /** @description Asserts that Google Pay's merchant-managed credential fields are hidden. */
  async $tf_assertGooglePayMerchantManagedFieldsHidden() {
    await this.connectionsPage.assertGooglePayMerchantManagedFieldsHidden();
  }

  /** @description Saves an edited connection, verifies success, and waits for the toast to clear. */
  async $tf_saveEditedConnection() {
    await this.connectionsPage.saveEditedConnection();
  }

  /** @description Asserts the persisted DEUNA-managed Google Pay name and selected configuration values. */
  async $tf_assertGooglePayConfiguration({
    merchantName,
    checkedLabels,
  }: {
    merchantName: string;
    checkedLabels: string[];
  }) {
    await this.connectionsPage.assertGooglePayConfiguration(merchantName, checkedLabels);
  }

  /** @description Asserts the persisted DEUNA-managed Apple Pay name, selected values, and merchant domain. */
  async $tf_assertApplePayConfiguration({
    merchantName,
    checkedLabels,
    merchantDomain,
  }: {
    merchantName: string;
    checkedLabels: string[];
    merchantDomain: string;
  }) {
    await this.connectionsPage.assertApplePayConfiguration(
      merchantName,
      checkedLabels,
      merchantDomain
    );
  }

  /** @description Asserts that the "Manejado por el comercio" certificate fields (public/private/TLS public/TLS private key) are visible. */
  async $tf_assertMerchantManagedFieldsVisible() {
    await this.connectionsPage.assertMerchantManagedFieldsVisible();
  }

  /** @description Asserts that the "Manejado por el comercio" certificate fields are hidden. */
  async $tf_assertMerchantManagedFieldsHidden() {
    await this.connectionsPage.assertMerchantManagedFieldsHidden();
  }

  /** @description Clicks the create/edit connection form's submit button ("Conectar"/"Guardar"). */
  async $tf_submitCreateConnectionForm() {
    await this.connectionsPage.submitCreateConnectionForm();
  }

  /** @description Confirms the second-step confirmation dialog shown after submitting a new connection's form. */
  async $tf_confirmCreateConnectionDialog() {
    await this.connectionsPage.confirmCreateConnectionDialog();
  }

  /** @description Starts capturing the wallet credential created by the Admin form for cleanup. */
  async $tf_captureCreatedWalletCredential() {
    if (this.walletCredentialResponseHandler) {
      this.context.page.off('response', this.walletCredentialResponseHandler);
    }

    this.walletCredentialResponse = undefined;
    this.walletCredentialResponseHandler = (response) => {
      if (
        response.request().method() === 'POST' &&
        response.url() === `${envConfig.BASE_URL_POSTMAN}/wallet/credentials` &&
        response.ok()
      ) {
        this.walletCredentialResponse = response.json();
      }
    };
    this.context.page.on('response', this.walletCredentialResponseHandler);
  }

  /** @description Deletes a wallet credential created by the test, using explicit values or the captured create response. */
  async $tf_deleteWalletCredential({
    credentialId,
    token,
  }: { credentialId?: string; token?: string } = {}) {
    if (this.walletCredentialResponseHandler) {
      this.context.page.off('response', this.walletCredentialResponseHandler);
      this.walletCredentialResponseHandler = undefined;
    }

    const credential = credentialId ? undefined : await this.walletCredentialResponse;
    const id = credentialId ?? credential?.id ?? credential?.data?.id;
    if (!id) return;

    const authorizationToken =
      token ?? (await this.context.page.evaluate(() => localStorage.getItem('token')));
    if (!authorizationToken) throw new Error('Cannot delete wallet credential without a token');

    const response = await this.context.page.request.delete(
      `${envConfig.BASE_URL_POSTMAN}/wallet/credentials/${id}`,
      { headers: { Authorization: `Bearer ${authorizationToken}` } }
    );
    if (!response.ok()) {
      throw new Error(`Failed to delete wallet credential: HTTP ${response.status()}`);
    }
  }
}
