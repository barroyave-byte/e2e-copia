// GENERATED FILE — DO NOT EDIT.
// Run `npm run generate-action-types` after changing any plugin.
// Scope: 70 registered plugin(s)
// Actions: 862

import type { PaymentLinksResponse } from '../../pages/admin/payment_link/interfaces/paymentLink';
import type { FraudExpectation } from '../../support/api_sup/global_assert/fraudAnalysis';
import type { WebSDKWidgetConfig } from '../../support/clients/checkout/websdk/interfaces';
import type { ApiResponse } from '../../support/http/BaseHttpClient';
import type { GetOrdersListResponse, TokenizeOrderRequestData, TokenizeOrderResponse } from '../../support/http/models/order';
import type { ConfigurationMerchantPaymentsData } from '../../support/http/models/payment';
import type { TransactionTraceResponse } from '../../support/http/models/transactionTrace';
import type { AddressUserRequestData, RegisterUserRequestData, UserCardRequestData } from '../../support/http/models/userAuth';
import type { BaseUserAddressCreditCard } from '../../support/interfaces/address_user/baseUserAddressCreditCard';
import type { BaseValidationCapture } from '../../support/interfaces/capture/baseValidationCapture';
import type { BaseCreditCard } from '../../support/interfaces/credit_cards/baseCreditCard';
import type { MercadoPagoWalletCardDetails } from '../../support/interfaces/credit_cards/mercadopagoWalletCreditCards';
import type { BaseProcessor } from '../../support/interfaces/payment_processors/baseProcessor';
import type { BazGatewayDeUna3DSProcessor } from '../../support/interfaces/payment_processors/bazProcessor';
import type { MercadoPagoWalletProcessor } from '../../support/interfaces/payment_processors/mercadoPagoWalletProcessor';
import type { BaseValidationRefund } from '../../support/interfaces/refund/baseValidationRefund';
import type { RiskOption } from '../../support/interfaces/riskOption';
import type { BaseUserData } from '../../support/interfaces/user_data/baseUserData';
import type { BaseValidationVoid } from '../../support/interfaces/void/baseValidationVoid';
import type { ConfigurationV2, Transaction } from '../../support/newman/apiCallNewman';
import type { ConfigureInstallmentCampaignParams, GoToAdminAndSetMerchantIdParams } from '../plugins/admin/admin.consolidatedFlows';
import type { RelativeDateRange } from '../plugins/admin/admin.logs';
import type { AssertActivityLogParams, AssertSplitTrackingPathNameParams, AssertStatusParams, CapturePartialParams, FilterByFraudStatusParams, GoToOrderParams, OpenFiltersAndSelectFieldParams, RefundPartialParams, SelectComboboxItemsParams } from '../plugins/admin/admin.orders';
import type { StartCaptureParams, VerifyEventCountParams, VerifyMetadataParams, VerifySequenceParams, WaitForEventParams } from '../plugins/analytics/interfaces';
import type { AssertOrderAffiliationParams, AssertTransactionPayloadParams } from '../plugins/api/api.bazSync';
import type { AssertBambooCardDataParams, AssertOrderFraudAnalysisParams, AssertOrderShippingContactParams, AssertPurchaseCardIntegrityParams } from '../plugins/api/api.orders';
import type { PurchaseConcurrentParams, PurchaseV2WithCreditCardParams, PurchaseWithCreditCardParams, PurchaseWithSavedCardParams } from '../plugins/api/api.payment';
import type { OpenCheckoutParams } from '../plugins/checkout/checkout';
import type { FintocLoginParams, FintocSelectBankParams } from '../plugins/checkout/checkout.apm.fintoc';
import type { AddInstallmentsParams, ExpectedOrderParams, FillDocumentAndConsentParams, FillIdentityDocumentParams, GetPlanOptionIdParams, SelectPaymentMethodOptionParams, ValidateConsentCPFParams } from '../plugins/checkout/checkout.apm.nupay';
import type { FillPseFormParams } from '../plugins/checkout/checkout.apm.pse';
import type { WaitRemoteTranslationsParams } from '../plugins/checkout/checkout.bnpl.addi';
import type { EnterEmailParams } from '../plugins/checkout/checkout.email';
import type { AssertInstallmentsResponseParams } from '../plugins/checkout/checkout.installments';
import type { AssertRedirectStatusParams, AssertThankyouPageParams, RedeemCouponParams, SelectAndFillCvvParams, SelectInstallmentsParams } from '../plugins/checkout/checkout.paymentLink';
import type { AssertAddress1BorderColorParams, AssertBillingDropdownBorderColorParams, AssertOrderStatusParams, ClickClosestClearButtonParams, ClickPayParams, FillBillingAddress1Params, FillCardNumberParams, FillCreditCardParams, SelectBillingDropdownOptionParams } from '../plugins/checkout/checkout.paymentWidget';
import type { AssertOrderConfirmedParams } from '../plugins/checkout/checkout.postTransaction';
import type { FillShippingAddressParams } from '../plugins/checkout/checkout.userData';
import type { AssertEventWasFiredParams, AssertOrderStatusPurchaseV2Params, AssertPurchaseSendProperPlanOptionIdParams, AssertSavedCardIsVisibleParams, AssertSelectedDeletionBlockedParams, AssertTextVisibleInIframeParams, AssertTransactionPaymentStatusParams, CardByNumberParams, ClickOnPayParams, EnterOtpCodeParams, FillCardFormParams, FillCvvInCardFormParams, FillFormVaultParams, FillNameBillingFormParams, SelectInstallmentsMSIParams, SelectSavedCardParams, StubSubscriptionLookupsParams } from '../plugins/checkout/checkout.vault';
import type { InterceptorRequest } from '../plugins/checkout/checkout.wallet.nequi';
import type { WaitParams } from '../plugins/core/core.timing';
import type { SelectPaymentMethodParams } from '../plugins/payment/payment.page';
import type { CampaignParams } from '../plugins/setup/setup.campaign';
import type { ConfigureManualReviewEngineParams } from '../plugins/setup/setup.fraud';
import type { CreateOrderOptions } from '../plugins/setup/setup.order';
import type { CreateCascadeRuleParams } from '../plugins/setup/setup.routing';
import type { VerifyCheckoutIframeParams } from '../plugins/visual/visual.checkout';
import type { BrowserContext, Response } from 'playwright-core';

/** Every DSL action, as a discriminated union on `action`. */
export type ActionStep =
  /** Navigates to the admin login page and logs in with the provided credentials, or falls back to default ADMIN_CREDENTIALS. */
  | { action: 'admin.auth.login'; stepName?: string; params?: { username?: string; password?: string } }
  /** Opens the settings menu and clicks the logout button to end the admin session. */
  | { action: 'admin.auth.logout'; stepName?: string }
  /** Sets the selected merchant ID in session storage and reloads the page. merchantId defaults to the merchant from a previous setup.merchant action. */
  | { action: 'admin.auth.setMerchantSession'; stepName?: string; params?: { merchantId?: string } }
  /** Activates the AVS toggle switch if it is not already checked. */
  | { action: 'admin.avs.activateAvsToggle'; stepName?: string }
  /** Asserts the first changelog entry has a non-empty title, description and timestamp. */
  | { action: 'admin.avs.assertFirstHistoryEntryHasContent'; stepName?: string }
  /** Asserts the AVS history dialog is visible with at least one changelog entry. */
  | { action: 'admin.avs.assertHistoryDialogVisible'; stepName?: string }
  /** Clicks the AVS tab in the error management page to display the AVS configuration form. */
  | { action: 'admin.avs.clickAvsTab'; stepName?: string }
  /** Closes the AVS history dialog. */
  | { action: 'admin.avs.closeHistory'; stepName?: string }
  /** Deactivates the AVS toggle switch if it is currently active. */
  | { action: 'admin.avs.deactivateAvsToggle'; stepName?: string }
  /** Randomly deselects a subset of the previously selected AVS code checkboxes. */
  | { action: 'admin.avs.deselectAvsCodeCheckboxes'; stepName?: string }
  /** Opens the AVS configuration changelog dialog via the history button. */
  | { action: 'admin.avs.openHistory'; stepName?: string }
  /** Saves the current AVS configuration form. */
  | { action: 'admin.avs.saveConfiguration'; stepName?: string }
  /** Randomly selects a subset of AVS code checkboxes and tracks the selected test IDs for later verification. */
  | { action: 'admin.avs.selectAvsCodeCheckboxes'; stepName?: string }
  /** Selects all three AVS configuration checkboxes (unknown, empty, unsupported) and verifies each is checked. */
  | { action: 'admin.avs.selectConfigurationCheckboxes'; stepName?: string }
  /** Asserts that the AVS toggle switch is visible and unchecked. */
  | { action: 'admin.avs.verifyAvsToggleDeactivated'; stepName?: string }
  /** Asserts a success toast is visible after saving the AVS configuration. */
  | { action: 'admin.avs.verifySuccessToast'; stepName?: string }
  /** Asserts that the batch job reaches the specified status, retrying by clicking the update table button. */
  | { action: 'admin.batchProcessing.assertBatchStatus'; stepName?: string; params: { state: "Procesando" | "Completado" | "Rechazado" } }
  /** Clicks the save/validate button to submit the batch job. */
  | { action: 'admin.batchProcessing.clickSaveBatchJob'; stepName?: string }
  /** Clicks the update table button to refresh the batch jobs list. */
  | { action: 'admin.batchProcessing.clickUpdateTable'; stepName?: string }
  /** Clicks the upload batch job button to open the batch job creation form. */
  | { action: 'admin.batchProcessing.clickUploadBatchJobButton'; stepName?: string }
  /** Creates a valid batch job CSV file in memory from the provided file data object. */
  | { action: 'admin.batchProcessing.createBatchJobFile'; stepName?: string; params: { fileData: unknown } }
  /** Sets the batch job file input with the provided filename and CSV buffer. */
  | { action: 'admin.batchProcessing.setBatchJobFileInput'; stepName?: string; params: { name: string; file: Buffer } }
  /** Fills the batch job name input with the provided name. */
  | { action: 'admin.batchProcessing.setBatchJobName'; stepName?: string; params: { batchJobName: string } }
  /** Fills a merchant domain into the domain list input and clicks "Agregar dominio" to add it. */
  | { action: 'admin.connections.addMerchantDomain'; stepName?: string; params: { domain: string } }
  /** Asserts that all 3DS merchant configuration fields (merchant ID, name, country, URL, category code, Visa and Mastercard acquirer bins) are saved with the expected values. */
  | { action: 'admin.connections.assert3DSInfoSaved'; stepName?: string; params: { processor: BazGatewayDeUna3DSProcessor } }
  /** Asserts the persisted DEUNA-managed Apple Pay name, selected values, and merchant domain. */
  | { action: 'admin.connections.assertApplePayConfiguration'; stepName?: string; params: { merchantName: string; checkedLabels: string[]; merchantDomain: string } }
  /** Asserts the untouched Apple Pay form shows its base fields and no preselected credential flow. */
  | { action: 'admin.connections.assertApplePayInitialConfiguration'; stepName?: string }
  /** Asserts that a named connection card is visible in the Descubrir catalog. */
  | { action: 'admin.connections.assertConnectionAvailable'; stepName?: string; params: { connectionName: string } }
  /** Asserts that a connection was successfully configured by verifying the success checkmark icon is visible, then closes the success modal. */
  | { action: 'admin.connections.assertConnectionConfigured'; stepName?: string }
  /** Asserts that the connection form not-found state shows the expected title and the form is hidden. */
  | { action: 'admin.connections.assertConnectionFormNotFoundState'; stepName?: string; params: { title: string; description: string } }
  /** Asserts that the connections table's error state is no longer visible. */
  | { action: 'admin.connections.assertConnectionsTableErrorHidden'; stepName?: string }
  /** Asserts that the connections table's error state is visible. */
  | { action: 'admin.connections.assertConnectionsTableErrorVisible'; stepName?: string }
  /** Asserts that the Descubrir tab's error state is no longer visible. */
  | { action: 'admin.connections.assertDiscoverErrorHidden'; stepName?: string }
  /** Asserts that the Descubrir tab's error state (shown when the processor catalog fails to load) is visible. */
  | { action: 'admin.connections.assertDiscoverErrorVisible'; stepName?: string }
  /** Asserts the persisted DEUNA-managed Google Pay name and selected configuration values. */
  | { action: 'admin.connections.assertGooglePayConfiguration'; stepName?: string; params: { merchantName: string; checkedLabels: string[] } }
  /** Asserts that Google Pay's merchant-managed credential fields are hidden. */
  | { action: 'admin.connections.assertGooglePayMerchantManagedFieldsHidden'; stepName?: string }
  /** Asserts that Google Pay's merchant-managed credential fields are visible. */
  | { action: 'admin.connections.assertGooglePayMerchantManagedFieldsVisible'; stepName?: string }
  /** Asserts that the "Manejado por el comercio" certificate fields are hidden. */
  | { action: 'admin.connections.assertMerchantManagedFieldsHidden'; stepName?: string }
  /** Asserts that the "Manejado por el comercio" certificate fields (public/private/TLS public/TLS private key) are visible. */
  | { action: 'admin.connections.assertMerchantManagedFieldsVisible'; stepName?: string }
  /** Asserts that the named connection is visible with pending status in the current tab. */
  | { action: 'admin.connections.assertPendingProcessor'; stepName?: string; params: { connectionName: string } }
  /** Asserts that a connection with the given name is visible in the currently active connections tab. */
  | { action: 'admin.connections.assertProcessorAdded'; stepName?: string; params: { connectionName: string } }
  /** Asserts that a connection with the given name is not visible in the currently active connections tab. */
  | { action: 'admin.connections.assertProcessorNotAdded'; stepName?: string; params: { connectionName: string } }
  /** Starts capturing the wallet credential created by the Admin form for cleanup. */
  | { action: 'admin.connections.captureCreatedWalletCredential'; stepName?: string }
  /** Clicks the checkbox to select DeUna as the 3DS provider in the connection configuration. */
  | { action: 'admin.connections.clickCheckboxAllowDeuna3DS'; stepName?: string }
  /** Clicks the retry button inside the connections table's error state. */
  | { action: 'admin.connections.clickRetryOnConnectionsTableError'; stepName?: string }
  /** Clicks the retry button inside the Descubrir tab's error state to refetch the processor catalog. */
  | { action: 'admin.connections.clickRetryOnDiscoverError'; stepName?: string }
  /** Clicks the allow security method (3DS) switch toggle in the connection configuration. */
  | { action: 'admin.connections.clickSwitchAllowSecurityMethod'; stepName?: string }
  /** Clicks the vaulting checkbox in the connection configuration drawer. */
  | { action: 'admin.connections.clickVaultingCheckbox'; stepName?: string }
  /** Closes the currently open processor configuration drawer by pressing the Escape key. */
  | { action: 'admin.connections.closeDrawer'; stepName?: string }
  /** Searches for a connection, selects it, fills in all processor configuration fields, and asserts that the connection was successfully configured. */
  | { action: 'admin.connections.configureConnection'; stepName?: string; params: { connectionName: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later"; processorData: BaseProcessor; processorType?: string } }
  /** Enables the 3DS security method, selects the DeUna 3DS option, and fills in all required 3DS merchant configuration fields, then saves. */
  | { action: 'admin.connections.configureDeUna3DS'; stepName?: string; params: { processorData: BazGatewayDeUna3DSProcessor } }
  /** Fills in the MercadoPago wallet expiration time fields, toggles binary mode, and confirms the processor edit. */
  | { action: 'admin.connections.configureMercadoPagoWallet'; stepName?: string; params: { processorData: MercadoPagoWalletProcessor } }
  /** Toggles the DeUna multiple partial capture checkbox (when mode is "offline"), fills in cutoff days if provided, and finalizes the connection edit. */
  | { action: 'admin.connections.configureMultiplePartialCapture'; stepName?: string; params: { processorData: BaseProcessor } }
  /** Configures the DeUna multiple partial refund settings (refund cutoff days) and finalizes the connection edit. */
  | { action: 'admin.connections.configureMultiplePartialRefund'; stepName?: string; params: { processorData: BaseProcessor } }
  /** Confirms the second-step confirmation dialog shown after submitting a new connection's form. */
  | { action: 'admin.connections.confirmCreateConnectionDialog'; stepName?: string }
  /** Deletes a wallet credential created by the test, using explicit values or the captured create response. */
  | { action: 'admin.connections.deleteWalletCredential'; stepName?: string; params?: { credentialId?: string; token?: string } }
  /** From the "Activos" tab, opens the first connection's row menu, clicks "Deshabilitar" and confirms the disable-connection modal. */
  | { action: 'admin.connections.disableConnection'; stepName?: string; params?: { closeSuccessModal?: boolean } }
  /** From the "Deshabilitados" tab, opens the first connection's row menu, clicks "Habilitar" and confirms the enable-connection modal. */
  | { action: 'admin.connections.enableConnection'; stepName?: string; params?: { closeSuccessModal?: boolean } }
  /** Fills the merchant name field in the create/edit connection form. */
  | { action: 'admin.connections.fillMerchantName'; stepName?: string; params: { name: string } }
  /** Fills the wallet merchant id field in a wallet's create/edit connection form. */
  | { action: 'admin.connections.fillWalletMerchantId'; stepName?: string; params: { id: string } }
  /** Opens the "Activos" (enabled) connections tab. */
  | { action: 'admin.connections.goToActiveConnectionsTab'; stepName?: string }
  /** Opens the "Deshabilitados" (disabled) connections tab. */
  | { action: 'admin.connections.goToDisabledConnectionsTab'; stepName?: string }
  /** Opens the "Pendientes" (pending) connections tab. */
  | { action: 'admin.connections.goToPendingConnectionsTab'; stepName?: string }
  /** Opens the processor create route for the provided catalog provider ID. */
  | { action: 'admin.connections.goToProcessorCreateRoute'; stepName?: string; params: { providerId: string } }
  /** Opens a processor connection edit route using the supplied resource key. */
  | { action: 'admin.connections.goToProcessorEditRoute'; stepName?: string; params: { resourceKey: string } }
  /** Opens the processor configuration drawer by navigating to active connections, clicking the options button, and selecting the edit option. */
  | { action: 'admin.connections.openProcessorDrawer'; stepName?: string }
  /** Saves an edited connection, verifies success, and waits for the toast to clear. */
  | { action: 'admin.connections.saveEditedConnection'; stepName?: string }
  /** Searches for a connection by name in the connections list. Optionally filters by processor type (e.g. "fraud") before searching. */
  | { action: 'admin.connections.searchConnection'; stepName?: string; params: { connectionName: string; processorType?: string } }
  /** Clicks a configuration value checkbox identified by its visible label (e.g. a card network or an authentication method). */
  | { action: 'admin.connections.selectConfigurationCheckbox'; stepName?: string; params: { label: string } }
  /** Clicks the connect button for the given connection name to begin adding that connection. */
  | { action: 'admin.connections.selectConnection'; stepName?: string; params: { connectionName: string } }
  /** Selects the credential flow radio option ("merchant_managed" or "deuna_managed") in a wallet's create/edit connection form. */
  | { action: 'admin.connections.selectCredentialFlow'; stepName?: string; params: { mode: "merchant_managed" | "deuna_managed" } }
  /** Selects the DEUNA gateway in the Google Pay configuration form. */
  | { action: 'admin.connections.selectGooglePayDeunaGateway'; stepName?: string }
  /** Opens the processor type dropdown and selects the given type (e.g. "fraud", "payment_gateway", "alternative_payment_method"). */
  | { action: 'admin.connections.selectProcessorType'; stepName?: string; params: { processorType: string } }
  /** Clicks the create/edit connection form's submit button ("Conectar"/"Guardar"). */
  | { action: 'admin.connections.submitCreateConnectionForm'; stepName?: string }
  /** Updates the cutoff days for multiple partial capture without toggling the checkbox, then finalizes the connection edit. */
  | { action: 'admin.connections.updateCutOffMultiplePartialCapture'; stepName?: string; params: { processorData: BaseProcessor } }
  /** Updates the cutoff days for multiple partial refund without toggling the checkbox, then finalizes the connection edit. */
  | { action: 'admin.connections.updateCutOffMultiplePartialRefund'; stepName?: string; params: { processorData: BaseProcessor } }
  /** Configures an MSI/MCI installment campaign from the admin installments page using the provided campaign definition. */
  | { action: 'admin.consolidatedFlows.configureInstallmentCampaign'; stepName?: string; params: ConfigureInstallmentCampaignParams }
  /** Navigates to the admin page and sets the merchant ID in session storage (defaults to the stored test merchant when not provided). */
  | { action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId'; stepName?: string; params?: GoToAdminAndSetMerchantIdParams }
  /** Applies the bulk checkout-message modal and waits for it to close. */
  | { action: 'admin.errorManagement.applyBulkCheckoutMessage'; stepName?: string }
  /** Asserts the ActionHeader disappears (no rows selected). */
  | { action: 'admin.errorManagement.assertActionHeaderHidden'; stepName?: string }
  /** Asserts the ActionHeader (bulk action select + apply button) is visible and shows the given selected-row count. */
  | { action: 'admin.errorManagement.assertActionHeaderVisibleWithCount'; stepName?: string; params: { count: number } }
  /** Asserts every currently visible row's action dropdown shows the given action. */
  | { action: 'admin.errorManagement.assertAllVisibleRowsHaveAction'; stepName?: string; params: { action: "retry" | "decline" } }
  /** Asserts the non-destructive change-confirmation dialog (role="dialog") is visible. */
  | { action: 'admin.errorManagement.assertChangeConfirmDialogVisible'; stepName?: string }
  /** Asserts the "Mensaje de Checkout" column and its edit buttons are visible (requires the merchant to be allowlisted for CHECKOUT_MESSAGE_VISIBILITY_MERCHANTS). */
  | { action: 'admin.errorManagement.assertCheckoutMessageColumnVisible'; stepName?: string }
  /** Asserts the reset-to-default button for the given language is disabled. */
  | { action: 'admin.errorManagement.assertCheckoutMessageResetDisabled'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Asserts the reset-to-default button for the given language is enabled. */
  | { action: 'admin.errorManagement.assertCheckoutMessageResetEnabled'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Asserts the checkout-message modal's Save button is enabled. */
  | { action: 'admin.errorManagement.assertCheckoutMessageSaveEnabled'; stepName?: string }
  /** Asserts the given language's textarea is empty. */
  | { action: 'admin.errorManagement.assertCheckoutMessageTextareaEmpty'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Asserts the given language's textarea shows the expected value. */
  | { action: 'admin.errorManagement.assertCheckoutMessageTextareaValue'; stepName?: string; params: { code: "es" | "en" | "pt"; expected: string } }
  /** Asserts the paginator's "previous page" button is disabled. */
  | { action: 'admin.errorManagement.assertPreviousPageDisabled'; stepName?: string }
  /** Asserts the paginator's "previous page" button is enabled. */
  | { action: 'admin.errorManagement.assertPreviousPageEnabled'; stepName?: string }
  /** Asserts the destructive reset-confirmation dialog (role="alertdialog") is visible. */
  | { action: 'admin.errorManagement.assertResetConfirmDialogVisible'; stepName?: string }
  /** Asserts the given rows' checkboxes are unchecked. */
  | { action: 'admin.errorManagement.assertRowCheckboxesUnchecked'; stepName?: string; params: { rowIds: string[] } }
  /** Asserts the visible row count is at least the given number. */
  | { action: 'admin.errorManagement.assertRowCountAtLeast'; stepName?: string; params: { min: number } }
  /** Asserts the visible row count is at most the given number. */
  | { action: 'admin.errorManagement.assertRowCountAtMost'; stepName?: string; params: { max: number } }
  /** Asserts the row count exactly equals min(pageSize, total), proving a page-size change actually took effect. */
  | { action: 'admin.errorManagement.assertRowCountMatchesPageSize'; stepName?: string; params: { pageSize: number; total: number } }
  /** Asserts the given row shows no reset button or default-override controls. */
  | { action: 'admin.errorManagement.assertRowHasNoOverrideControls'; stepName?: string; params: { rowId: string } }
  /** Asserts the given row's reset button and override controls are hidden. */
  | { action: 'admin.errorManagement.assertRowResetControlsHidden'; stepName?: string; params: { rowId: string } }
  /** Asserts the given row's action dropdown shows the given action. */
  | { action: 'admin.errorManagement.assertRowShowsAction'; stepName?: string; params: { rowId: string; action: "retry" | "decline" } }
  /** Asserts each of the given rows' individual action dropdown shows the given action. */
  | { action: 'admin.errorManagement.assertRowsShowAction'; stepName?: string; params: { rowIds: string[]; action: "retry" | "decline" } }
  /** Asserts a success toast is visible. */
  | { action: 'admin.errorManagement.assertSuccessToastVisible'; stepName?: string }
  /** Asserts the current "N total" error count equals the given value. */
  | { action: 'admin.errorManagement.assertTotalCountEquals'; stepName?: string; params: { expected: number } }
  /** Asserts the current "N total" error count is less than the given value. */
  | { action: 'admin.errorManagement.assertTotalCountLessThan'; stepName?: string; params: { max: number } }
  /** Cancels the individual checkout-message modal without saving. */
  | { action: 'admin.errorManagement.cancelCheckoutMessage'; stepName?: string }
  /** Opens the row's action dropdown and selects the option opposite to its current value; returns the newly chosen action. */
  | { action: 'admin.errorManagement.changeRowActionToOpposite'; stepName?: string; params: { rowId: string } }
  /** Opens the ActionHeader's action select and chooses "retry" or "decline". */
  | { action: 'admin.errorManagement.chooseBulkAction'; stepName?: string; params: { action: "retry" | "decline" } }
  /** Clears the search input. */
  | { action: 'admin.errorManagement.clearSearch'; stepName?: string }
  /** Clicks the ActionHeader's Apply button, opening the bulk-apply confirmation modal. */
  | { action: 'admin.errorManagement.clickApplyBulkAction'; stepName?: string }
  /** Clicks the ActionHeader's "edit message" button, opening the bulk checkout-message modal. */
  | { action: 'admin.errorManagement.clickBulkEditMessage'; stepName?: string }
  /** Clicks the checkout-message edit button for the given row. */
  | { action: 'admin.errorManagement.clickEditCheckoutMessage'; stepName?: string; params: { rowId: string } }
  /** Clicks the paginator's "next page" button and waits for the page info to change. */
  | { action: 'admin.errorManagement.clickNextPage'; stepName?: string }
  /** Clicks the table's refresh button. */
  | { action: 'admin.errorManagement.clickRefresh'; stepName?: string }
  /** Clicks the reset-to-default button for the given language. */
  | { action: 'admin.errorManagement.clickResetCheckoutMessage'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Confirms the currently open single-row action modal (change or reset) and waits for it to close. */
  | { action: 'admin.errorManagement.confirmActionModal'; stepName?: string }
  /** Confirms the bulk-apply modal and waits for it to close. */
  | { action: 'admin.errorManagement.confirmBulkApply'; stepName?: string }
  /** Reads a short substring from the first visible row's processor error message, for use as a live search term. */
  | { action: 'admin.errorManagement.getFirstRowMessageSubstring'; stepName?: string }
  /** Returns the row's current action ("retry" or "decline") as shown by its dropdown. */
  | { action: 'admin.errorManagement.getRowAction'; stepName?: string; params: { rowId: string } }
  /** Reads the current "N total" error count from the page. */
  | { action: 'admin.errorManagement.getTotalCount'; stepName?: string }
  /** Returns the row id of the first row that has a checkout-message edit button (requires the allowlisted merchant). */
  | { action: 'admin.errorManagement.pickFirstCheckoutMessageRow'; stepName?: string }
  /** Finds and returns the id of the first PSP error row with no existing merchant override. */
  | { action: 'admin.errorManagement.pickRowWithoutOverride'; stepName?: string }
  /** Clicks the reset-to-default button on the given row. */
  | { action: 'admin.errorManagement.resetRowToDefault'; stepName?: string; params: { rowId: string } }
  /** Saves the checkout-message modal and waits for it to close. */
  | { action: 'admin.errorManagement.saveCheckoutMessage'; stepName?: string }
  /** Types the given term into the search input and waits for the debounce. */
  | { action: 'admin.errorManagement.searchByText'; stepName?: string; params: { term: string } }
  /** Opens the actionable filter and selects "all", "retry" or "decline". */
  | { action: 'admin.errorManagement.selectActionableFilter'; stepName?: string; params: { value: "retry" | "decline" | "all" } }
  /** Selects a language tab (es/en/pt) in the bulk checkout-message modal. */
  | { action: 'admin.errorManagement.selectBulkCheckoutMessageLanguageTab'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Selects a language tab (es/en/pt) in the individual checkout-message modal. */
  | { action: 'admin.errorManagement.selectCheckoutMessageLanguageTab'; stepName?: string; params: { code: "es" | "en" | "pt" } }
  /** Selects N PSP error rows by their checkboxes, starting at an optional offset, and returns their row ids. */
  | { action: 'admin.errorManagement.selectFirstRows'; stepName?: string; params: { count: number; offset?: number } }
  /** Selects a page size (10, 25, 50 or 100) from the paginator. */
  | { action: 'admin.errorManagement.selectPageSize'; stepName?: string; params: { size: 10 | 25 | 50 | 100 } }
  /** Opens the processor filter and selects the option matching the given processor name. */
  | { action: 'admin.errorManagement.selectProcessorFilterByName'; stepName?: string; params: { name: string } }
  /** Types a checkout message into the bulk modal's given language textarea. */
  | { action: 'admin.errorManagement.typeBulkCheckoutMessage'; stepName?: string; params: { code: "es" | "en" | "pt"; text: string } }
  /** Types a checkout message into the given language's textarea. */
  | { action: 'admin.errorManagement.typeCheckoutMessage'; stepName?: string; params: { code: "es" | "en" | "pt"; text: string } }
  /** Clicks the fraud processor type option in the admin connections processor type selector. */
  | { action: 'admin.fraud.clickFraudProcessorOption'; stepName?: string }
  /** Searches, selects, and configures the Cybersource fraud processor connection in the admin connections page. */
  | { action: 'admin.fraud.configureCybersource'; stepName?: string; params: { processorData: BaseProcessor } }
  /** Fills the fraud provider configuration form in the explore/checkout iframe using the provider field configuration map. */
  | { action: 'admin.fraud.fillFraudForm'; stepName?: string; params: { provider: "CLEARSALE" | "CLEARSALE-BRASIL" | "CYBERSOURCE" | "MERCADOPAGO" | "SIFT" | "SIGNIFYD" | "STRIPE" | "KOUNT" | "KOIN" | "KONDUTO" | "OPENPAY" | "RISKIFIED" | "ACCERTIFY" | "PAYU"; data: Record<string, string | false | true> } }
  /** Asserts that the created campaign appears in the plans table by its name. */
  | { action: 'admin.installments.assertCampaignActive'; stepName?: string; params: { campaignName: string } }
  /** Clicks the create campaign button on the installments configuration page to open the campaign creation form. */
  | { action: 'admin.installments.createCampaignClick'; stepName?: string }
  /** Finds a campaign by name and clicks the delete action from its context menu. */
  | { action: 'admin.installments.deleteCampaign'; stepName?: string; params: { campaignName: string } }
  /** Clicks the edit button for a specific month to open the month configuration panel. */
  | { action: 'admin.installments.editMonthDescription'; stepName?: string; params: { month: number } }
  /** Opens the campaign type dropdown and selects either MSI (meses sin intereses) or MCI (meses con intereses). */
  | { action: 'admin.installments.selectCampaignType'; stepName?: string; params: { type: "MSI" | "MCI" } }
  /** Toggles the franchise checkbox for the given franchise name within a month configuration panel. */
  | { action: 'admin.installments.selectFranchise'; stepName?: string; params: { franchise: string } }
  /** Selects the installment month checkboxes in campaign creation step 4 for each provided month number. */
  | { action: 'admin.installments.selectMonthCheckbox'; stepName?: string; params: { months: number[] } }
  /** Selects one or more payment processors in the campaign creation step 3. Pass null to select the first available processor. */
  | { action: 'admin.installments.selectPaymentProcessor'; stepName?: string; params: { processors: ("Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later")[] } }
  /** Applies a date range on the records list relative to today, confirms it, and waits for the filtered audit logs request. */
  | { action: 'admin.logs.applyDateRange'; stepName?: string; params: RelativeDateRange }
  /** Selects a date range containing a record returned by the current merchant, avoiding assumptions about when shared audit data was last populated. */
  | { action: 'admin.logs.applyDateRangeContainingAvailableRecord'; stepName?: string }
  /** Selects an export date range relative to today and confirms it, enabling the submit button. */
  | { action: 'admin.logs.applyExportDateRange'; stepName?: string; params: RelativeDateRange }
  /** Opens the advanced-filter picker and asserts Section, Action, Severity, and Result are available. */
  | { action: 'admin.logs.assertAdvancedFiltersAvailable'; stepName?: string }
  /** Asserts the records date filter displays a selected range instead of its placeholder. */
  | { action: 'admin.logs.assertDateRangeIsDisplayed'; stepName?: string }
  /** Asserts the download button for the given export id is disabled (export not yet completed). */
  | { action: 'admin.logs.assertDownloadButtonDisabled'; stepName?: string; params: { exportId: string } }
  /** Asserts the Downloads table has at least minRows export rows. */
  | { action: 'admin.logs.assertDownloadsTableHasRows'; stepName?: string; params?: { minRows?: number } }
  /** Finds an expired export in Downloads and asserts its download button is disabled. */
  | { action: 'admin.logs.assertExpiredExportDownloadDisabled'; stepName?: string }
  /** Asserts the app remains on Export with its date range and section selection preserved after an error. */
  | { action: 'admin.logs.assertExportFormPreserved'; stepName?: string; params: { section: string } }
  /** Asserts the export created by submitExportAndAssertNavigation is listed with name, creation date, and status. */
  | { action: 'admin.logs.assertExportListed'; stepName?: string; params: { exportId: string } }
  /** Asserts the export submit button starts disabled before a valid date range is picked. */
  | { action: 'admin.logs.assertExportSubmitIsDisabled'; stepName?: string }
  /** Asserts that the audit log records table shows its five visible column headers (createdAt, executedBy, action, section, ip). */
  | { action: 'admin.logs.assertRecordsColumns'; stepName?: string }
  /** Asserts that tomorrow and a date older than the 90-day records limit are disabled in the date picker. */
  | { action: 'admin.logs.assertRecordsDateBounds'; stepName?: string }
  /** Asserts the audit log records table has at least minRows rows. */
  | { action: 'admin.logs.assertRecordsTableHasRows'; stepName?: string; params?: { minRows?: number } }
  /** Asserts that the total record count is displayed next to the Records table title. */
  | { action: 'admin.logs.assertTotalCountVisible'; stepName?: string }
  /** Asserts a view-only Logs user can see Records but not Downloads or Export controls. */
  | { action: 'admin.logs.assertViewOnlyAccess'; stepName?: string }
  /** Cancels Export and verifies its section selection carries over to Records. */
  | { action: 'admin.logs.cancelExportAndAssertSectionCarryover'; stepName?: string; params: { section: string } }
  /** Opens the page size selector of the records table, selects the given page size, and asserts the table shows at most that many rows. */
  | { action: 'admin.logs.changePageSize'; stepName?: string; params: { pageSize: number } }
  /** Opens the "Agregar filtro" picker and clicks "Limpiar" to reset search/date/advanced filters to their defaults. */
  | { action: 'admin.logs.clearAllFilters'; stepName?: string }
  /** Clears the selected records date range and verifies unfiltered records are restored. */
  | { action: 'admin.logs.clearDateRangeAndAssertRestored'; stepName?: string }
  /** Clicks the Downloads table refresh button. */
  | { action: 'admin.logs.clickDownloadsRefetch'; stepName?: string }
  /** Clicks the refresh (refetch) button of the audit log records table. */
  | { action: 'admin.logs.clickRefetch'; stepName?: string }
  /** Collapses the first expanded audit-log row and asserts its details are hidden. */
  | { action: 'admin.logs.collapseFirstRecord'; stepName?: string }
  /** Copies the first export name and verifies the clipboard matches the visible row. */
  | { action: 'admin.logs.copyFirstExportName'; stepName?: string }
  /** Copies the first row's full entry, asserts the temporary copied state, and validates the clipboard contains JSON. */
  | { action: 'admin.logs.copyFirstRecordEntry'; stepName?: string }
  /** Copies the first row's IP, asserts the temporary copied state, and validates the clipboard value. */
  | { action: 'admin.logs.copyFirstRecordIp'; stepName?: string }
  /** Clicks the download button for a completed export and asserts the browser download event fires with a filename. */
  | { action: 'admin.logs.downloadExport'; stepName?: string; params: { exportId: string } }
  /** Enables one generated advanced filter by key and applies the selection. */
  | { action: 'admin.logs.enableAdvancedFilter'; stepName?: string; params: { filter: "section" | "action" | "severity" | "result" } }
  /** Expands the first audit-log row and asserts that the Details tab is selected. */
  | { action: 'admin.logs.expandFirstRecordAndAssertDetails'; stepName?: string }
  /** Polls for an audit record matching section, action, severity, and result, then returns its actor for combined-filter assertions. Use saveAs to reference it later. */
  | { action: 'admin.logs.getMatchingRecordExecutedBy'; stepName?: string; params: { section: string; action: string; severity: string; result: string } }
  /** Opens the Downloads tab and waits for export rows. */
  | { action: 'admin.logs.goToDownloads'; stepName?: string }
  /** Clicks the Export button on the records page and waits for the /logs/export route to load. */
  | { action: 'admin.logs.goToExportPage'; stepName?: string }
  /** Advances the forward-only Downloads paginator and asserts no previous control exists. */
  | { action: 'admin.logs.goToNextDownloadsPage'; stepName?: string }
  /** Clicks the Logs sidebar menu item and waits for the /logs/records route to load. */
  | { action: 'admin.logs.goToRecords'; stepName?: string }
  /** Opens the forbidden Logs export route and asserts the real 404 state is shown without the export form. */
  | { action: 'admin.logs.openForbiddenExportAndAssertNotFound'; stepName?: string }
  /** Opens the JSON tab of the expanded row, searches for term, and asserts the JSON still contains it. */
  | { action: 'admin.logs.openJsonAndSearch'; stepName?: string; params: { term: string } }
  /** Types a term into the pinned records search input (debounced 300ms in the app). */
  | { action: 'admin.logs.searchRecords'; stepName?: string; params: { term: string } }
  /** Opens the records Action filter and selects the requested audit event. */
  | { action: 'admin.logs.selectActionFilterOption'; stepName?: string; params: { action: string } }
  /** Opens the export section filter and selects the given section option (e.g. USERS, AUTH, SECURITY, REPORTS, ORDERS). */
  | { action: 'admin.logs.selectExportSection'; stepName?: string; params: { section: string } }
  /** Opens the records Result filter and selects the requested value. */
  | { action: 'admin.logs.selectResultFilterOption'; stepName?: string; params: { result: string } }
  /** Opens the records Section filter combobox (must already be enabled via enableAdvancedFilter) and selects the given section option. */
  | { action: 'admin.logs.selectSectionFilterOption'; stepName?: string; params: { section: string } }
  /** Opens the records Severity filter and selects the requested value. */
  | { action: 'admin.logs.selectSeverityFilterOption'; stepName?: string; params: { severity: string } }
  /** Stubs two deterministic Downloads API pages so copy and forward-pagination behavior does not depend on shared export history. */
  | { action: 'admin.logs.stubDownloadsPagination'; stepName?: string }
  /** Forces the export POST to return 500, submits the form, and asserts the error notification is shown without navigation. */
  | { action: 'admin.logs.submitExportAndAssertError'; stepName?: string }
  /** Submits the export form and waits for the app to navigate to the Downloads tab, which only happens once the export request succeeds. Returns the created export's id (read from the response body) — use saveAs to reference it later. */
  | { action: 'admin.logs.submitExportAndAssertNavigation'; stepName?: string }
  /** Polls the Downloads table (refreshing periodically) until the given export id reaches the target status (e.g. "completed"), since export processing is asynchronous and a refetch is required to observe the transition. */
  | { action: 'admin.logs.waitForExportStatus'; stepName?: string; params: { exportId: string; status: string } }
  /** Asserts that the GMV orders metrics iframe src contains the selected date as both dateFrom and dateTo. */
  | { action: 'admin.metrics.assertGmvOrdersMetricsHasProperDateRange'; stepName?: string }
  /** Asserts that the GMV orders metrics iframe src contains the merchantId parameter. */
  | { action: 'admin.metrics.assertGmvOrdersMetricsHasValidURL'; stepName?: string }
  /** Asserts that the current URL pathname is /metrics, confirming the metrics page is active. */
  | { action: 'admin.metrics.assertMetricsPage'; stepName?: string }
  /** Asserts that the specified metrics tab has aria-selected="true", indicating it is the active tab. */
  | { action: 'admin.metrics.assertMetricsTabSelected'; stepName?: string; params: { metricsType: "sales" | "acceptanceRate" | "paymentStrategy" | "reconciliation" } }
  /** Asserts that the go-to-reports modal confirmation button is visible. */
  | { action: 'admin.metrics.assertModalGoToReportIsVisible'; stepName?: string }
  /** Asserts that the current page URL is the reports downloads page. */
  | { action: 'admin.metrics.assertPresenceInReports'; stepName?: string }
  /** Asserts that all principal metrics elements are visible: period filter, temporality filter, clear button, and all metric iframes. */
  | { action: 'admin.metrics.assertPrincipalMetrics'; stepName?: string }
  /** Asserts that the reports table has at least one visible row. */
  | { action: 'admin.metrics.assertTableHaveAtLeastOneRow'; stepName?: string }
  /** Clicks the schedule reports type button to open the dropdown menu of report types. */
  | { action: 'admin.metrics.clickOpenScheduleReportTypes'; stepName?: string }
  /** Clicks the download button for the specified report file ID in the reports table. */
  | { action: 'admin.metrics.downloadReport'; stepName?: string; params: { fileId: string } }
  /** Clicks the specific report type option to navigate to the schedule report creation form. */
  | { action: 'admin.metrics.goToScheduleReportCreationForm'; stepName?: string; params: { reportType: "reconciliations" | "orders" } }
  /** Clicks the specified metrics tab (sales, acceptanceRate, paymentStrategy, or reconciliation). */
  | { action: 'admin.metrics.selectMetricsTab'; stepName?: string; params: { metricsType: "sales" | "acceptanceRate" | "paymentStrategy" | "reconciliation" } }
  /** Clicks the pagination size selector and selects the specified page size option. */
  | { action: 'admin.metrics.selectPaginationOption'; stepName?: string; params: { option: string } }
  /** Opens the date picker, selects today as both the start and end date, and applies the filter. */
  | { action: 'admin.metrics.selectPeriodFilter'; stepName?: string }
  /** Polls the reports file list GET request (reloading and re-selecting the page size between attempts) until a file with status SUCCESS and version v2 is available, and stores it for later use. Assumes the given page size was already selected before calling this action. */
  | { action: 'admin.metrics.waitForAvailableReportFile'; stepName?: string; params?: { pageSize?: string } }
  /** Makes a fixed number of requests matching the URL pattern fail, then lets later requests through to the real backend. Register before the triggering action. */
  | { action: 'admin.mocks.failRequests'; stepName?: string; params: { urlPattern: string; status?: number } }
  /** Stops intercepting requests matching the URL pattern. */
  | { action: 'admin.mocks.restoreRequests'; stepName?: string; params: { urlPattern: string } }
  /** Navigates to the admin page root URL. */
  | { action: 'admin.navigate.goToAdminPage'; stepName?: string }
  /** Clicks the Batch Processing navigation button to navigate to the batch processing section. */
  | { action: 'admin.navigate.goToBatchProcessing'; stepName?: string }
  /** Clicks the Connections navigation button and verifies the connections section is displayed. */
  | { action: 'admin.navigate.goToConnections'; stepName?: string }
  /** Clicks the Error Management navigation button and verifies the error management section is displayed. */
  | { action: 'admin.navigate.goToErrorManagement'; stepName?: string }
  /** Clicks the Installments navigation button and verifies the installments section is displayed. */
  | { action: 'admin.navigate.goToInstallments'; stepName?: string }
  /** Clicks the Metrics navigation button and verifies the metrics section is displayed. */
  | { action: 'admin.navigate.goToMetrics'; stepName?: string }
  /** Clicks the Orders navigation button and verifies the orders section is displayed. */
  | { action: 'admin.navigate.goToOrders'; stepName?: string }
  /** Clicks the Payment Link navigation button and verifies the payment links section is displayed. */
  | { action: 'admin.navigate.goToPaymentLinks'; stepName?: string }
  /** Clicks the Roles and Permissions navigation button and verifies the roles and permissions section is displayed. */
  | { action: 'admin.navigate.goToRoles'; stepName?: string }
  /** Clicks the Payment Strategy (routing) navigation button and verifies the payment strategy section is displayed. */
  | { action: 'admin.navigate.goToRouting'; stepName?: string }
  /** Clicks the Subscriptions navigation link and waits for the subscriptions URL to load. */
  | { action: 'admin.navigate.goToSubscriptions'; stepName?: string }
  /** Clicks the merchant combobox in the sidebar, types the merchant name in the search field, and selects the matching option. */
  | { action: 'admin.navigate.selectMerchant'; stepName?: string; params: { merchantName: string; merchantId: string } }
  /** Asserts that the activity log contains an entry matching the given status key from the activity registry translations. */
  | { action: 'admin.orders.assertActivityLog'; stepName?: string; params: AssertActivityLogParams }
  /** Asserts that the orders table contains at least one order row. */
  | { action: 'admin.orders.assertAtLeastOneOrder'; stepName?: string }
  /** Asserts that at least one of the given split tracking path names is visible in the order details page. */
  | { action: 'admin.orders.assertSplitTrackingPathName'; stepName?: string; params: AssertSplitTrackingPathNameParams }
  /** Asserts the payment status displayed in the order details page. */
  | { action: 'admin.orders.assertStatus'; stepName?: string; params: AssertStatusParams }
  /** Captures a partial amount of the order via the actionable menu. */
  | { action: 'admin.orders.capturePartial'; stepName?: string; params: CapturePartialParams }
  /** Captures the total amount of the order via the actionable menu. */
  | { action: 'admin.orders.captureTotal'; stepName?: string }
  /** Opens the more-filters panel and selects the given fraud status option in the orders list. */
  | { action: 'admin.orders.filterByFraudStatus'; stepName?: string; params: FilterByFraudStatusParams }
  /** Navigates to the order details page. Both values are optional: orderToken defaults to the order created by a previous setup.order action, and merchantId to the merchant from a previous setup.merchant action. Specs that still provision in beforeAll fall back to the legacy globals. Pass them explicitly (or with ref()) to make the dependency visible. */
  | { action: 'admin.orders.goToOrder'; stepName?: string; params?: GoToOrderParams }
  /** Opens the advanced filters panel and selects a specific filter field by name. */
  | { action: 'admin.orders.openFiltersAndSelectField'; stepName?: string; params: OpenFiltersAndSelectFieldParams }
  /** Refunds a partial amount of the order via the actionable menu. */
  | { action: 'admin.orders.refundPartial'; stepName?: string; params: RefundPartialParams }
  /** Refunds the total amount of the order via the actionable menu. */
  | { action: 'admin.orders.refundTotal'; stepName?: string }
  /** Interacts with a dynamic combobox filter. Detects the combobox trigger by field name, opens it, optionally searches, and selects one or more items. field_name supports both hyphen and underscore formats (e.g., payment-status or payment_status). */
  | { action: 'admin.orders.selectComboboxItems'; stepName?: string; params: SelectComboboxItemsParams }
  /** Voids the order via the actionable menu, selecting a void reason and confirming. */
  | { action: 'admin.orders.void'; stepName?: string }
  /** Fills the product name and amount fields and clicks save to add a product to the payment link. */
  | { action: 'admin.paymentLinks.addProduct'; stepName?: string; params: { productName: string; productAmount: string } }
  /** Asserts that the payment links list page is visible by checking the page title heading. */
  | { action: 'admin.paymentLinks.assertPaymentLinkPage'; stepName?: string }
  /** Asserts that a payment link row with the given ID is visible in the data grid. */
  | { action: 'admin.paymentLinks.assertPaymentLinkRowVisible'; stepName?: string; params: { paymentLinkId: string } }
  /** Asserts that the payment links data grid is visible on the page. */
  | { action: 'admin.paymentLinks.assertTableContainsData'; stepName?: string }
  /** Clicks the cancel button in the payment link action modal to dismiss without applying changes. */
  | { action: 'admin.paymentLinks.cancelAction'; stepName?: string }
  /** Clicks the clear filters button to reset all search and filter inputs on the payment links list page. */
  | { action: 'admin.paymentLinks.clearFilters'; stepName?: string }
  /** Clicks the confirm button in the payment link action modal (e.g., for enabling or disabling a link). */
  | { action: 'admin.paymentLinks.confirmAction'; stepName?: string }
  /** Fills the payment link name input on the create payment link form. */
  | { action: 'admin.paymentLinks.fillProductLinkName'; stepName?: string; params: { name: string } }
  /** Searches through the payment links response data and returns the payment link object matching the given name, or undefined if not found. */
  | { action: 'admin.paymentLinks.findPaymentLinkByName'; stepName?: string; params: { data: PaymentLinksResponse; name: string } }
  /** Clicks the create payment link button and waits for navigation to the new payment link form page. */
  | { action: 'admin.paymentLinks.navigateToCreatePaymentLink'; stepName?: string }
  /** Types a search term into the payment links search input to filter the table. */
  | { action: 'admin.paymentLinks.searchPaymentLink'; stepName?: string; params: { searchTerm: string } }
  /** Asserts the selected report columns section is visible. */
  | { action: 'admin.reports.assertColumnsVisible'; stepName?: string }
  /** Asserts the report detail's filters section contains the active status filter. */
  | { action: 'admin.reports.assertFiltersContainActiveStatus'; stepName?: string }
  /** Asserts the report detail's filters section contains the given Plan ID. */
  | { action: 'admin.reports.assertFiltersContainPlanId'; stepName?: string; params: { planId: string } }
  /** Asserts the report detail's origin text matches the expected pattern. */
  | { action: 'admin.reports.assertOriginText'; stepName?: string; params: { expected: string | RegExp } }
  /** Asserts the total count of selected report columns is at least the given minimum. */
  | { action: 'admin.reports.assertSelectedColumnsCountAtLeast'; stepName?: string; params: { minimum: number } }
  /** Waits for the Downloads/Reports page URL and asserts the reports title is visible. */
  | { action: 'admin.reports.assertTitleVisible'; stepName?: string }
  /** Asserts the report detail's type text matches the expected pattern for the given report type. */
  | { action: 'admin.reports.assertTypeText'; stepName?: string; params: { expected: string | RegExp; reportType: string } }
  /** Opens the report details row matching the given file name. */
  | { action: 'admin.reports.openReportDetails'; stepName?: string; params: { fileName: string } }
  /** Asserts that the main form inputs are hidden (disabled) when viewing user details in read-only mode. */
  | { action: 'admin.roles.assertFormInputsAreDisabled'; stepName?: string }
  /** Asserts that the page is in create new user mode by checking the URL and form title. */
  | { action: 'admin.roles.assertIsCreateNewUserMode'; stepName?: string }
  /** Asserts basic user info details are visible, confirming the page is in view or edit user mode. */
  | { action: 'admin.roles.assertIsViewOrEditUserMode'; stepName?: string; params: { userName: string; userEmail: string } }
  /** Asserts that the missing permissions error message is visible in the permissions step. */
  | { action: 'admin.roles.assertMissingPermissionsErrorMessage'; stepName?: string }
  /** Asserts that all specified permission checkboxes are checked for the given merchant. */
  | { action: 'admin.roles.assertPermissionsChecked'; stepName?: string; params: { merchantId: string; keys: ("reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs" | "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations")[] } }
  /** Asserts that the browser is on the create new role page and the form title and description are visible. */
  | { action: 'admin.roles.assertPresenceInCreateRoleForm'; stepName?: string }
  /** Asserts that the browser is on the edit role page for the given role and the edit form is properly displayed. */
  | { action: 'admin.roles.assertPresenceInEditRoleForm'; stepName?: string; params: { roleName: string; roleId: string } }
  /** Asserts that the role details summary (name, environments, merchants, permissions) are correctly displayed on the review step. */
  | { action: 'admin.roles.assertRoleDetails'; stepName?: string; params: { roleName: string; permissions: Record<string, ("reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs" | "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations")[]>; environments: ("production" | "sandbox")[]; merchants: string[]; networkName?: string } }
  /** Asserts that the role details view is in read-only mode with all form inputs hidden and permission checkboxes disabled. */
  | { action: 'admin.roles.assertRoleDetailsAreReadOnly'; stepName?: string; params: { merchantIds: string[] } }
  /** Asserts that the user creation confirmation modal is visible. */
  | { action: 'admin.roles.assertUserCreationModalIsVisible'; stepName?: string }
  /** Asserts all user detail fields in the review step, including name, email, role/permissions, environments, merchants, and permissions. */
  | { action: 'admin.roles.assertUserDetails'; stepName?: string; params: { userName: string; userEmail: string; roleOrPermissions: "role" | "permissions"; roleName?: string; merchants?: string[]; environments?: ("production" | "sandbox")[]; permissions?: Record<string, ("reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs" | "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations")[]>; networkName?: string; rolePermissions?: string; roleEnvironments?: string } }
  /** Asserts that the user details view is in read-only mode with all form inputs hidden and permission checkboxes disabled. */
  | { action: 'admin.roles.assertUserDetailsAreReadOnly'; stepName?: string; params: { merchantIds: string[] } }
  /** Cancels the current user creation or edit operation. */
  | { action: 'admin.roles.cancelEditOrCreation'; stepName?: string }
  /** Clicks the cancel button to abort role creation or editing. */
  | { action: 'admin.roles.cancelRoleCreation'; stepName?: string }
  /** Checks an action permission checkbox for the given merchant in the permissions step. */
  | { action: 'admin.roles.checkAction'; stepName?: string; params: { action: "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations"; merchantId: string } }
  /** Checks all permission checkboxes visible in a merchant column and returns the list of checked permission keys. */
  | { action: 'admin.roles.checkAllColumnMerchantPermissions'; stepName?: string; params: { merchantId: string } }
  /** Randomly checks a given number of permissions for the merchant and returns the checked permission keys. */
  | { action: 'admin.roles.checkRandomPermissions'; stepName?: string; params: { merchantId: string; total?: number } }
  /** Checks a resource permission checkbox for the given merchant in the permissions step. */
  | { action: 'admin.roles.checkResource'; stepName?: string; params: { resource: "reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs"; merchantId: string } }
  /** Clicks the create new role button to begin the role creation wizard. */
  | { action: 'admin.roles.clickCreateRole'; stepName?: string }
  /** Clicks the create new user button to begin the user creation wizard. */
  | { action: 'admin.roles.clickCreateUser'; stepName?: string }
  /** Confirms the user creation by clicking the save/confirm button in the confirmation modal. */
  | { action: 'admin.roles.confirmCreation'; stepName?: string }
  /** Creates and updates a temporary role to emit a role-permissions audit event. */
  | { action: 'admin.roles.createAndUpdateRolePermissions'; stepName?: string; params: { merchantId: string; merchantName: string; roleName: string } }
  /** Creates a new merchant admin user with the given details, selecting merchant access type. */
  | { action: 'admin.roles.createMerchantAdmin'; stepName?: string; params: { userName: string; userLastName: string; userEmail: string; merchantName: string; merchantId: string } }
  /** Creates a new merchant user with the given details, selecting merchant access type. */
  | { action: 'admin.roles.createMerchantUser'; stepName?: string; params: { userName: string; userLastName: string; userEmail: string; merchantName: string; merchantId: string } }
  /** Creates a network user with custom permissions for one merchant and returns the generated password. */
  | { action: 'admin.roles.createNetworkUserWithPermissions'; stepName?: string; params: { name: string; email: string; networkName: string; networkId: string; merchantName: string; merchantId: string; environments: ("production" | "sandbox")[]; permissions: ("reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs" | "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations")[] } }
  /** Finds and deletes the role with the given name using the roles table context menu. */
  | { action: 'admin.roles.deleteRole'; stepName?: string; params: { roleName: string } }
  /** Deletes the role with the given name and reassigns its users to the specified replacement role. */
  | { action: 'admin.roles.deleteRoleWithReassignment'; stepName?: string; params: { roleName: string; reassignRoleName: string } }
  /** Fills the role name input field with the provided name. */
  | { action: 'admin.roles.fillRoleName'; stepName?: string; params: { roleName: string } }
  /** Fills the email input field in the user creation form. */
  | { action: 'admin.roles.fillUserEmail'; stepName?: string; params: { userEmail: string } }
  /** Fills the last name input field in the user creation form. */
  | { action: 'admin.roles.fillUserLastName'; stepName?: string; params: { userLastName: string } }
  /** Fills the first name input field in the user creation form. */
  | { action: 'admin.roles.fillUserName'; stepName?: string; params: { userName: string } }
  /** Navigates to the create new user page. */
  | { action: 'admin.roles.goToCreateUserView'; stepName?: string }
  /** Navigates to the edit role form for the given role ID. */
  | { action: 'admin.roles.goToEditRole'; stepName?: string; params: { roleId: string } }
  /** Navigates to the Roles tab on the roles and permissions page. */
  | { action: 'admin.roles.goToRolesTab'; stepName?: string }
  /** Navigates to the Users tab on the roles and permissions page. */
  | { action: 'admin.roles.goToUsersTab'; stepName?: string }
  /** Navigates to the read-only role details view for the given role ID. */
  | { action: 'admin.roles.goToViewRoleDetails'; stepName?: string; params: { roleId: string } }
  /** Clicks the save changes button to persist edits to an existing role. */
  | { action: 'admin.roles.saveChanges'; stepName?: string }
  /** Saves edits to an existing user by clicking the save user button. */
  | { action: 'admin.roles.saveEditionChanges'; stepName?: string }
  /** Clicks the save/activate role button to complete role creation. */
  | { action: 'admin.roles.saveRole'; stepName?: string }
  /** Selects the access type (network or merchant) in the create/edit role form. */
  | { action: 'admin.roles.selectAccessType'; stepName?: string; params: { type: "network" | "merchant" } }
  /** Selects the merchant access type in the user access type step. */
  | { action: 'admin.roles.selectAccessTypeMerchant'; stepName?: string }
  /** Selects the network access type in the user access type step. */
  | { action: 'admin.roles.selectAccessTypeNetwork'; stepName?: string }
  /** Searches for and selects a merchant by name in the role access type step. */
  | { action: 'admin.roles.selectMerchant'; stepName?: string; params: { merchantName: string; merchantId: string } }
  /** Searches for and selects a network by name in the role access type step. */
  | { action: 'admin.roles.selectNetwork'; stepName?: string; params: { networkName: string; networkId: string } }
  /** Selects multiple network merchants by name in the role access type step. */
  | { action: 'admin.roles.selectNetworkMerchants'; stepName?: string; params: { merchantNames: string[] } }
  /** Checks the production environment checkbox in the role environment step. */
  | { action: 'admin.roles.selectProductionEnvironment'; stepName?: string }
  /** Selects the merchant admin role option in the role or permissions selection step. */
  | { action: 'admin.roles.selectRoleMerchantAdmin'; stepName?: string }
  /** Selects the merchant owner role option in the role or permissions selection step. */
  | { action: 'admin.roles.selectRoleMerchantOwner'; stepName?: string }
  /** Selects the merchant user role option in the role or permissions selection step. */
  | { action: 'admin.roles.selectRoleMerchantUser'; stepName?: string }
  /** Selects the superadmin role option in the role or permissions selection step. */
  | { action: 'admin.roles.selectRoleSuperadmin'; stepName?: string }
  /** Checks the sandbox environment checkbox in the role environment step. */
  | { action: 'admin.roles.selectSandboxEnvironment'; stepName?: string }
  /** Selects the custom permissions option (instead of role) in the role or permissions step. */
  | { action: 'admin.roles.selectSpecificPermissions'; stepName?: string }
  /** Toggles a specific resource or action permission checkbox for a merchant, checking or unchecking as specified. */
  | { action: 'admin.roles.togglePermission'; stepName?: string; params: { type: "action" | "resource"; key: string; merchantId: string; check: boolean } }
  /** Unchecks an action permission checkbox for the given merchant in the permissions step. */
  | { action: 'admin.roles.uncheckAction'; stepName?: string; params: { action: "editPaymentLink" | "editConnections" | "editVoucher" | "editRouting" | "scheduleReport" | "downloadReports" | "editInstallments" | "editCommerceConfig" | "editFraudConditions" | "editManage2faPolicy" | "editMPC" | "editErrorManagement" | "editBatchProcessing" | "editCheckoutConfig" | "createRole" | "editRole" | "deleteRole" | "createUser" | "createUserWithRole" | "createUserWithCustomPermissions" | "enableUser" | "editUser" | "disableUser" | "reset2fa" | "editPaymentOperations" | "exportAdhocReports" | "createDatasourceRecon" | "uploadDatasourceRecon" | "deleteDatasourceRecon" | "exportConciliationRecon" | "createEditReconciliations"; merchantId: string } }
  /** Unchecks all currently-checked permission checkboxes for the given merchant. */
  | { action: 'admin.roles.uncheckAllPermissions'; stepName?: string; params: { merchantId: string } }
  /** Unchecks a resource permission checkbox for the given merchant in the permissions step. */
  | { action: 'admin.roles.uncheckResource'; stepName?: string; params: { resource: "reconciliations" | "orders" | "home" | "conciliations" | "metrics" | "batchProcessing" | "commerce" | "checkoutConfig" | "connections" | "errorManagement" | "installments" | "reports" | "routing" | "rolesAndPermissions" | "paymentLink" | "metricsReconciliations" | "commerceVoucherTab" | "commercePaymentsConfigTab" | "commerceSecurityTab" | "subscriptions" | "notifications" | "logs" | "exportLogs"; merchantId: string } }
  /** Adds a BIN condition to a specific routing rule. Clicks the Bin option and fills in the 6-digit BIN code (e.g. "424242" for Visa test cards, "555555" for Mastercard test cards). Must be called after addConditionStepSpecificRule. */
  | { action: 'admin.routing.addConditionBin'; stepName?: string; params: { bin: string } }
  /** Adds a condition to a specific rule by uploading a CSV file containing email addresses. */
  | { action: 'admin.routing.addConditionCSVEmailList'; stepName?: string }
  /** Adds a condition to a specific rule using a manually entered email list. Optionally use an incorrect email or a custom email address. */
  | { action: 'admin.routing.addConditionManualEmailList'; stepName?: string; params?: { emailIncorrect?: boolean; email?: string } }
  /** Adds a condition to a specific rule using a manually entered store code list with a given operator condition. */
  | { action: 'admin.routing.addConditionManualStoreCodeList'; stepName?: string; params: { condition: string; stores: string } }
  /** Adds a metadata condition to a specific routing rule. Configures the variable name, format type (text or number), operator (eq or neq), and value. */
  | { action: 'admin.routing.addConditionMetadata'; stepName?: string; params: { variableName: string; formatType?: "number" | "text"; operator?: "eq" | "neq"; value?: string } }
  /** Clicks the add condition button to open the condition type selector in the specific rule creation wizard. */
  | { action: 'admin.routing.addConditionStepSpecificRule'; stepName?: string }
  /** Adds an additional payment processor to the routing by clicking the decline default option and selecting "to process". */
  | { action: 'admin.routing.addPaymentProcessor'; stepName?: string }
  /** Adds a shadow mode member to the routing rule and selects the given fraud processor. */
  | { action: 'admin.routing.addShadowMode'; stepName?: string; params: { fraudProcessorShadowMode: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later" } }
  /** Asserts that the save/activate button is disabled because no conditions are configured. */
  | { action: 'admin.routing.assertSaveBlockedWithNoConditions'; stepName?: string }
  /** Clicks the edit button on the default processing rule to enter edit mode. */
  | { action: 'admin.routing.clickEditDefaultProcessing'; stepName?: string }
  /** Clicks the edit routing button within the default processing rule drawer. */
  | { action: 'admin.routing.clickEditRouting'; stepName?: string }
  /** Clicks the update button to confirm changes to the default processing rule. */
  | { action: 'admin.routing.clickUpdateDefaultProcessing'; stepName?: string }
  /** Configures routing for multiple processors sequentially, adding "Payment Processor" cascade entries between each. */
  | { action: 'admin.routing.configureRoutingMultipleProcessors'; stepName?: string; params: { processors: ("Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later")[] } }
  /** Clicks the create specific rule button to open the specific rule creation flow. */
  | { action: 'admin.routing.createSpecificRule'; stepName?: string }
  /** Clicks the decline transaction button within a payment strategy configuration. */
  | { action: 'admin.routing.declineTransactionForPaymentStrategy'; stepName?: string }
  /** Edits the default routing configuration by clicking the edit button and defining the processing order for the given processor(s). Optionally configures risk categories. */
  | { action: 'admin.routing.editDefaultRouting'; stepName?: string; params: { processor: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later" | ("Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later")[]; configRisks?: RiskOption[] } }
  /** Edits the default routing to configure multiple payment processors in sequence, saving and updating the configuration when done. */
  | { action: 'admin.routing.editDefaultRoutingManyProcessor'; stepName?: string; params: { processors: ("Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later")[] } }
  /** Opens the 'Agregar filtro' picker, adds the metadata filter, applies it, and fills in the key and value of the first metadata pair. */
  | { action: 'admin.routing.filterByMetadata'; stepName?: string; params: { key: string; value: string } }
  /** Filters the routing rules table by payment processor name using the combobox in the filter bar. */
  | { action: 'admin.routing.filterByProcessor'; stepName?: string; params: { processorName: string } }
  /** Filters the routing rules table by rule name using the multiselect combobox in the filter bar. */
  | { action: 'admin.routing.filterByRuleName'; stepName?: string; params: { ruleName: string } }
  /** Fills in the rule name input (defaults to 'New rule 2025' if not provided) and advances to the next step of specific rule creation. */
  | { action: 'admin.routing.firstStepSpecificRule'; stepName?: string; params?: { ruleName?: string } }
  /** Advances to the routing step of the specific rule creation wizard. */
  | { action: 'admin.routing.nextStepRouting'; stepName?: string }
  /** Reloads the routing page so the filter bar refetches its option catalog (a rule created in the same session is not offered until then). */
  | { action: 'admin.routing.reloadRoutingPage'; stepName?: string }
  /** Clicks the save rule button to persist the specific rule configuration, and the rule is going to be ready for save and activate. */
  | { action: 'admin.routing.saveRouting'; stepName?: string }
  /** Clicks the activate button so by this the rule is going to be active and saved. */
  | { action: 'admin.routing.saveRule'; stepName?: string }
  /** Clicks the save rule button and waits for the routing rules API response to confirm the rule was created. */
  | { action: 'admin.routing.saveRuleAndWaitForResponse'; stepName?: string }
  /** Selects a fraud engine from the processor dropdown. Optionally specify an index for multi-processor configurations. */
  | { action: 'admin.routing.selectDefaultFraudEngine'; stepName?: string; params: { fraudEngine: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later"; index?: number } }
  /** Selects a payment processor from the default payment engine dropdown. */
  | { action: 'admin.routing.selectDefaultPaymentEngine'; stepName?: string; params: { pspEngine: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later" } }
  /** Selects the last available payment processor from the processor dropdown and confirms with the "to process" action. */
  | { action: 'admin.routing.selectLastPaymentProcessor'; stepName?: string }
  /** Selects a post-authorization fraud processor from the fraud engine dropdown. */
  | { action: 'admin.routing.selectPostAuthFraudProcessor'; stepName?: string; params: { fraudEngine: "Kushki" | "MercadoPago" | "Adyen" | "Conekta" | "Stripe" | "Stripe Direct" | "SIFT" | "SIGNIFYD" | "CYBERSOURCE" | "CLEARSALE" | "CLEARSALE-BRASIL" | "Openpay" | "Pagarme" | "Cybersource" | "Cielo" | "Worldpay" | "nupay" | "RISKIFIED" | "KOUNT" | "ACCERTIFY" | "Amex" | "dLocal" | "PayUOxxo Cash" | "FemsaOxxo Cash" | "KUESKI" | "PayU" | "PAYU_EFECTY" | "Aplazo" | "Pagbank" | "Paymentez" | "Wompi" | "Wompi Direct" | "PayPal_wallet" | "paypal_acdc" | "Prisma" | "Prisma Payway" | "Bamboo" | "Globalpay" | "Unlimit" | "BAZ Gateway" | "MercadoPago Wallet" | "Volaris Reference" | "SPEI OPM" | "SafetyPay" | "Prosa" | "Placetopay" | "place to pay" | "Ebanx" | "ASAAS_PIX" | "NUVEI_PIX" | "DEUNA_WALLET" | "paypal_pay_later" } }
  /** Configures risk-level actions (process or decline) and associated processors for each provided risk level. */
  | { action: 'admin.routing.selectRiskToProcess'; stepName?: string; params: { riskLevels: RiskOption[] } }
  /** Clicks "Omitir" on the routing product tour if it appears (first-time users), so the strategies screen is usable. Run right after navigating to routing. */
  | { action: 'admin.routing.skipRoutingTourIfShown'; stepName?: string }
  /** Opens the first specific rule, navigates to routing configuration, and toggles the CVV validation checkbox before saving. */
  | { action: 'admin.routing.switchCvvValidationFromFirstRule'; stepName?: string }
  /** Asserts that a rule with the given name is visible in the rules list. */
  | { action: 'admin.routing.validateCustomRuleCreated'; stepName?: string; params: { ruleName: string } }
  /** Asserts that the default rule label is visible in the rules list, confirming successful rule creation. */
  | { action: 'admin.routing.validateRuleCreated'; stepName?: string }
  /** Asserts that the export columns selector is visible for the given report type. */
  | { action: 'admin.subscriptions.assertColumnsSelectorVisible'; stepName?: string; params: { reportType: string } }
  /** Asserts that the Export button is enabled for the given report type. */
  | { action: 'admin.subscriptions.assertExportButtonEnabled'; stepName?: string; params: { reportType: string } }
  /** Asserts that all expected column headers of the subscription plans table are visible. */
  | { action: 'admin.subscriptions.assertPlanTable'; stepName?: string }
  /** Asserts that the actionables button is visible on the subscription details page. */
  | { action: 'admin.subscriptions.assertSubscriptionActionableInDetails'; stepName?: string }
  /** Asserts that all expected column headers of the subscriptions table are visible. */
  | { action: 'admin.subscriptions.assertSubscriptionsTable'; stepName?: string }
  /** Selects the export report type and asserts the report fields request succeeds. */
  | { action: 'admin.subscriptions.chooseReportType'; stepName?: string; params: { reportType: string; merchantId: string } }
  /** Clicks the create plan button to navigate to the plan creation form. */
  | { action: 'admin.subscriptions.clickButtonCreatePlan'; stepName?: string }
  /** Expands the actionables menu on the subscription details page and clicks the cancel button. */
  | { action: 'admin.subscriptions.clickSubscriptionCancel'; stepName?: string }
  /** Clicks the dropdown icon on the first subscription row and selects the view details option. */
  | { action: 'admin.subscriptions.clickSubscriptionDetailsFromTable'; stepName?: string }
  /** Expands the actionables menu on the subscription details page and clicks the pause button. */
  | { action: 'admin.subscriptions.clickSubscriptionPause'; stepName?: string }
  /** Expands the actionables menu on the subscription details page and clicks the reactivate button. */
  | { action: 'admin.subscriptions.clickSubscriptionReactivate'; stepName?: string }
  /** Clicks the plans tab to display the subscription plans list. */
  | { action: 'admin.subscriptions.clickTabPlans'; stepName?: string }
  /** Clicks the subscriptions tab to display the subscriptions list. */
  | { action: 'admin.subscriptions.clickTabSubscriptions'; stepName?: string }
  /** Fills the Plan ID filter in the export dialog. */
  | { action: 'admin.subscriptions.fillPlanId'; stepName?: string; params: { planId: string } }
  /** Opens the export subscriptions dialog and fills in the report name. */
  | { action: 'admin.subscriptions.openExport'; stepName?: string; params: { reportName: string } }
  /** Selects the "active" status filter in the export dialog. */
  | { action: 'admin.subscriptions.selectActiveStatus'; stepName?: string }
  /** Selects all available columns in the export dialog. */
  | { action: 'admin.subscriptions.selectAllColumns'; stepName?: string }
  /** Selects the created-at date range in the export dialog. */
  | { action: 'admin.subscriptions.selectCreatedAtRange'; stepName?: string; params: { startDate: Date; endDate: Date } }
  /** Submits the export and asserts the accepted request and its payload. */
  | { action: 'admin.subscriptions.submitExport'; stepName?: string; params: { reportType: string; applyPlanFilters?: boolean; planId?: string } }
  /** Starts capturing postMessage events and /v1/track requests. Call before navigation. */
  | { action: 'analytics.events.startCapture'; stepName?: string; params?: StartCaptureParams }
  /** Asserts captured event was emitted exactly the expected number of times. */
  | { action: 'analytics.events.verifyEventCount'; stepName?: string; params: VerifyEventCountParams }
  /** Asserts latest event metadata matches expected and the event reached /v1/track. */
  | { action: 'analytics.events.verifyMetadata'; stepName?: string; params: VerifyMetadataParams }
  /** Asserts captured sequence equals expected and every event reached /v1/track at least once. Plain strings must match exactly; an `{ anyOf }` item accepts whichever of its candidate contiguous runs actually occurred (see SequenceItem). */
  | { action: 'analytics.events.verifySequence'; stepName?: string; params: VerifySequenceParams }
  /** Waits until an event was captured, without asserting anything about sequence or count. Use this instead of a fixed timing.wait to block on a real signal (e.g. an async auto-save finishing) before an action that would otherwise race it. Pass `nextOccurrence: true` when the event already fired earlier in the same flow (e.g. a repeated login/billing cycle) and reused presence would resolve immediately instead of waiting. */
  | { action: 'analytics.events.waitForEvent'; stepName?: string; params: WaitForEventParams }
  /** Fetches the order via GET Order (polling until it reaches expectedStatus) and asserts the fields baz-middleware builds `afiliacion` from: payment.data.merchant.affiliation_code equals expectedAffiliationCode and is digits only (BAZ rule); it is not the transaction's external_transaction_id; and merchant_payment_processor_id equals expectedMerchantPaymentProcessorId and is never the null UUID. privateKey and orderToken default to what a previous setup.merchant / setup.order action produced; pass orderToken explicitly when the spec created more than one order. */
  | { action: 'api.bazSync.assertOrderAffiliation'; stepName?: string; params: AssertOrderAffiliationParams }
  /** Fetches the order via GET Order and asserts the merchant and card fields of its payment data: merchant.affiliation_code equals expectedAffiliationCode and is numeric; from_card.expiry_year equals expectedExpiryYear and is numeric (up to 4 digits); merchant.store_code equals expectedStoreCode when given. Also fails when affiliation_code equals the transaction's external_transaction_id or the order's store_code. Polls until the payment data is populated. privateKey and orderToken default to what a previous setup.merchant / setup.order action produced. Returns the validated values — add saveAs to reference them from a later step. */
  | { action: 'api.bazSync.assertTransactionPayload'; stepName?: string; params: AssertTransactionPayloadParams }
  /** Asserts the processor operations of a Bamboo order (saved via api.orders.getProcessorTransactions, pass with ref()): their types and statuses match `expectedOperations` in order, and the request of the operation that carried the card (authorize, or purchase on automatic capture) sent a CardData object whose CVV, CardHolderName, Email, Expiration and Pan are all non-blank strings. */
  | { action: 'api.orders.assertBambooCardData'; stepName?: string; params: AssertBambooCardDataParams }
  /** Fetches the order and asserts the antifraud analysis it exposes under order.fraud. Polls until the fraud engine has written the analysis, so it is safe to call right after a purchase. Pass `matches` with the analysis saved from the purchase response to prove both sources agree. */
  | { action: 'api.orders.assertOrderFraudAnalysis'; stepName?: string; params?: AssertOrderFraudAnalysisParams }
  /** Asserts the shipping contact of a GET Order response (saved via api.orders.getOrder, pass with ref()): the expected HTTP status, the contact phone value, and that the phone is a JSON string rather than a number. Also checks contact.name and details.store_name when given. */
  | { action: 'api.orders.assertOrderShippingContact'; stepName?: string; params: AssertOrderShippingContactParams }
  /** Asserts that two consecutive GET /merchants/orders pages (saved via api.orders.listOrders, pass with ref()) together contain exactly the given order ids once each — no order_id missing, none repeated across pages. Compares by order.order_id. */
  | { action: 'api.orders.assertOrdersPagesCoverOrderIds'; stepName?: string; params: { firstPage: ApiResponse; secondPage: ApiResponse; expectedOrderIds: string[] } }
  /** Asserts the HTTP status — and optionally a subset of the body, e.g. { total, there_are_more_records } — of a GET /merchants/orders response saved via api.orders.listOrders (pass it with ref()). */
  | { action: 'api.orders.assertOrdersResponse'; stepName?: string; params: { response: ApiResponse; expectedStatus: number; expectedBody?: Partial<GetOrdersListResponse> } }
  /** Asserts, for every order in `transactions`, that the card data is coherent across the sources a concurrent-detokenization race can make disagree: - GET Order's `from_card.first_six` / `last_four` match the expected card. - Every settlement row has a `card_token`, and its `raw_request` parses as JSON with a `card_brand` matching `expectedCardBrand`. The processor's brand string is what it saw on the detokenized PAN — a swap into another card's PAN changes it (Visa 4000-… reports "visa"; Discover 6011-… reports "diners"). - The vault token DEUNA recorded (`settlement.card_token`) equals the vault token actually shipped in the outgoing message (`raw_request.message.field_63_reserved_private_data["02"]`, stripped of the `.CardCVV` suffix). A vault-URL race's fingerprint is exactly this pair disagreeing: DEUNA recorded card A's token but shipped card B's. - Cross-order: settlements sharing a `cardGroupLabel` MUST share one `card_token`, and settlements from different labels MUST have different `card_token`s. This is what catches token bleed between concurrent shoppers. Collects every discrepancy across all transactions before throwing, so a regression run reports every affected order at once rather than only the first one. */
  | { action: 'api.orders.assertPurchaseCardIntegrity'; stepName?: string; params: AssertPurchaseCardIntegrityParams }
  /** Asserts that an order paid through a cascade of affiliations was charged exactly once (RIS-147). `order` is a GET Order response (api.orders.getOrder, pass with ref()) and `transactions` the operations of its invoice (api.orders.getProcessorTransactions, pass with ref()). Fails when (1) GET Order is not HTTP 200 with the expected payment status; (2) the payment was not made through `expectedMerchantPaymentProcessorId`, the first affiliation of the cascade; (3) the invoice holds more or fewer than `expectedAttempts` purchase/authorize operations, i.e. a later affiliation was also attempted; (4) more than one of those operations was not declined, i.e. the customer was charged twice. The failure lists every operation read, so the message shows what the second affiliation did. */
  | { action: 'api.orders.assertSingleSuccessfulCharge'; stepName?: string; params: { order: ApiResponse; transactions: Transaction[]; expectedMerchantPaymentProcessorId: string; expectedStatus: string; expectedAttempts?: number } }
  /** Asserts that no Transaction Visibility event (saved via api.orders.getTransactionVisibility, pass with ref()) exposes the card (RIS-482). Fails when (1) a `requiredEvents` name is missing, so the check cannot pass on an empty feed; (2) the full PAN — also with spaces or dashes between digits — appears anywhere in any event; (3) the first or last 10 PAN digits appear, i.e. a defective partial mask such as the first 12 digits left visible (BIN + last 4 stay allowed); (4) a field named number, cardNumber, card_number or similar holds 12+ digits, or a cvv / cvc / cvv2 / securityCode field holds a 3–4 digit value. */
  | { action: 'api.orders.assertTransactionVisibilityMasksCard'; stepName?: string; params: { events: TransactionTraceResponse[]; pan: string; requiredEvents?: string[] } }
  /** Captures an order via API using the v2 capture endpoint. Optionally provide a partial capture amount and whether it is the final capture. Uses the given privateKey and orderToken, or falls back to the merchant and order stored in the test context. */
  | { action: 'api.orders.captureViaAPI'; stepName?: string; params: { validation: BaseValidationCapture; amount?: number; isFinal?: boolean; privateKey?: string; orderToken?: string } }
  /** Fetches an order via GET /v2/orders using the EMA service. privateKey and orderToken default to the merchant and order stored in the test context. Returns the full order response — add saveAs to reference it from a later step. */
  | { action: 'api.orders.getOrder'; stepName?: string; params?: { privateKey?: string; orderToken?: string } }
  /** Reads from Metabase the operations the payment service recorded for the order's invoice (authorize, capture, refund, void…), each with the raw request it sent to the processor and the raw response it got back. Polls until there is a row for every type in `untilTypes`, and returns what it has once the retries run out, so the assertion that reads it reports what is missing. orderToken defaults to the order from a previous setup.order action. Returns the rows — add saveAs to pass them to an assertion with ref(). */
  | { action: 'api.orders.getProcessorTransactions'; stepName?: string; params?: { orderToken?: string; untilTypes?: string[]; retries?: number; delayMs?: number } }
  /** Fetches the Metabase settlements rows for an order token via `getTransactionsSettlement`. Polls until at least `minCount` rows are indexed (Metabase is eventually consistent — a call right after a purchase can return an empty list). Each row carries the fields the concurrent-detokenization assertion needs: `card_token` (which saved card the transaction claims) and `raw_request` (the exact payload sent to the processor, i.e. the only surface where a vault-detokenization race is observable). Returns the array of settlement rows — add `saveAs` to reference it from a later step. */
  | { action: 'api.orders.getSettlements'; stepName?: string; params?: { orderToken?: string; minCount?: number; retries?: number; delayMs?: number } }
  /** Reads every `transaction_visibility` event of an order from GET /trace/logs (the feed the Admin's Transaction Visibility screen renders). Polls until an event named `untilEvent` (default `tv_continue_three_ds_called`, the 3DS Evaluation Update) is indexed; if it never shows up the events read so far are returned, so the assertion that consumes them reports the missing event. orderId, merchantId and merchantToken default to what a previous setup.order / setup.merchant action produced. Returns the events — add saveAs to pass them to api.orders.assertTransactionVisibilityMasksCard with ref(). */
  | { action: 'api.orders.getTransactionVisibility'; stepName?: string; params?: { orderId?: string; merchantId?: string; merchantToken?: string; untilEvent?: string; retries?: number; delayMs?: number } }
  /** Lists merchant orders via GET /merchants/orders — the endpoint behind the ADMIN panel's order list and pagination (PLAT-T1623 / EMA-9999). Pass `cursor` from a previous call's response to fetch the next page. privateKey defaults to the merchant stored in the test context. Set expectError to true to get an error response back instead of a thrown exception. Pass minTotal to poll (OpenSearch indexes purchased orders asynchronously — a call right after a purchase can undercount until indexing catches up) until `total` reaches it or retries are exhausted. Returns the full response — add saveAs to reference it from a later step (its cursor, or an assertion action). */
  | { action: 'api.orders.listOrders'; stepName?: string; params?: { pageSize?: number; cursor?: string; privateKey?: string; expectError?: boolean; minTotal?: number } }
  /** Refunds an order via API using the Newman/Postman collection runner. Optionally provide a partial refund amount. Uses the given privateKey or falls back to the merchant stored in the test context. */
  | { action: 'api.orders.refundViaAPI'; stepName?: string; params: { validation: BaseValidationRefund; amount?: number; privateKey?: string; orderToken?: string } }
  /** Voids an order via API using the Newman/Postman collection runner. Optionally provide a partial void amount. Uses the given privateKey or falls back to the merchant stored in the test context. */
  | { action: 'api.orders.voidViaAPI'; stepName?: string; params: { validation: BaseValidationVoid; amount?: number; privateKey?: string; orderToken?: string } }
  /** Polls GET Order until the payment reaches `status` (e.g. authorized, partial_captured, captured, voided, refunded, processed) and fails with the last status read when the retries run out. Use it after a purchase, capture, void or refund, whose status change EMA reflects asynchronously. privateKey and orderToken default to the merchant and order stored in the test context; pass orderToken explicitly when the spec created more than one order. */
  | { action: 'api.orders.waitForOrderStatus'; stepName?: string; params: { status: "failed" | "pending" | "processing" | "processed" | "denied" | "authorized" | "authorizing" | "pending_3ds" | "voided" | "partial_refunded" | "partial_refunding" | "refunded" | "refunding" | "captured" | "capturing" | "partial_capturing" | "partial_captured" | "cancelled"; privateKey?: string; orderToken?: string } }
  /** Asserts the antifraud analysis the last purchase response exposes under order.fraud: the object is present, carries every documented field, and matches the expected processor, risk level, decision and manual-review status. Returns the analysis — add saveAs to compare it against GET Order later. */
  | { action: 'api.payment.assertPurchaseFraudAnalysis'; stepName?: string; params?: FraudExpectation }
  /** Asserts the HTTP status code — and optionally a subset of the body — of the last purchase response. Throws if no purchase has been made yet. */
  | { action: 'api.payment.assertPurchaseStatus'; stepName?: string; params: { expectedStatus: number; expectedBody?: unknown } }
  /** Fires several saved-card purchases at the payment service at the same time (Promise.all), so the server has to detokenize several vault tokens concurrently. Each spec must reference a distinct `orderToken` and a saved `cardId` — build them with `setup.user.enrollCard` and `setup.order.createOrder` — and may set `cardCvv` to send the CVV the shopper re-enters. Each purchase is sent like api.payment.purchaseWithSavedCard sends its single one. Returns the array of purchase responses in the same order as the input specs, so a later step can pair each response with its expected card; the first one is what api.payment.assertPurchaseStatus checks. Fails a purchase-by-purchase check via `api.orders.assertPurchaseCardIntegrity`, not here — this action only orchestrates the fan-out. */
  | { action: 'api.payment.purchaseConcurrent'; stepName?: string; params: PurchaseConcurrentParams }
  /** Pays the order through purchase V2 (POST /v2/merchants/orders/purchase) as a guest, with the given credit card and processor name. The payload is built by `buildPurchaseV2Payload`, so the card address fields are the ones registered for `country`. Use it instead of api.payment.purchaseWithCreditCard when the case covers the V2 endpoint. orderToken, merchantId and privateKey all default to what a previous setup.order / setup.merchant action produced. Returns the purchase response, which api.payment.assertPurchaseStatus then checks. */
  | { action: 'api.payment.purchaseV2WithCreditCard'; stepName?: string; params: PurchaseV2WithCreditCardParams }
  /** Processes a payment via API without opening the checkout UI. Performs a guest login and calls the purchase endpoint with the given credit card and processor name. orderToken, merchantId and privateKey all default to what a previous setup.order / setup.merchant action produced. Pass cardOverrides to send raw card fields the fixture mapping would otherwise normalize (e.g. a 2-digit expiry_year) and transactionId to send a specific transaction_id. Returns the purchase response — add saveAs to reference it from a later step. */
  | { action: 'api.payment.purchaseWithCreditCard'; stepName?: string; params: PurchaseWithCreditCardParams }
  /** Pays the order with a card the registered shopper already saved (purchase V2 with card_info.card_id), authenticating as that shopper rather than as a guest. Pass cardCvv to send the CVV the shopper re-enters at checkout. orderToken and privateKey default to what a previous setup.order / setup.merchant action produced. Returns the purchase response, which api.payment.assertPurchaseStatus then checks. */
  | { action: 'api.payment.purchaseWithSavedCard'; stepName?: string; params: PurchaseWithSavedCardParams }
  /** Asserts that the APM redirect iframe is visible on the page, confirming that the APM modal has been mounted. */
  | { action: 'checkout.3ds.assertAPMModalMounted'; stepName?: string }
  /** Asserts that the Amex 3DS challenge page is visible by checking the ACS Emulator title inside the challenge iframe. */
  | { action: 'checkout.3ds.assertImAmex3DSChallengePage'; stepName?: string }
  /** Asserts that a specific text is visible in the PurchaseStatusView. Works with both popup (complete3DSChallengeStripeKeepOpen) and inline (selectPassChallengeStripeKeepOpen) flows. */
  | { action: 'checkout.3ds.assertPurchaseStatusViewText'; stepName?: string; params: { text: string } }
  /** Clicks the Redsys challenge submit button (#boton) to submit the currently selected challenge option. */
  | { action: 'checkout.3ds.clickSubmitChallenge'; stepName?: string }
  /** Closes the 3DS popup page that was kept open by complete3DSChallengeStripeKeepOpen. Call this after all PurchaseStatusView assertions are done. Accepts an optional timeout (ms) to wait before closing, useful to ensure pending tracking events (e.g. redirectResultPageViewed) are captured before the popup is destroyed. Not needed for inline flows (selectPassChallengeStripeKeepOpen). */
  | { action: 'checkout.3ds.closePurchaseStatusPopup'; stepName?: string; params?: { timeout?: number } }
  /** Waits for the Amex 3DS popup window, then completes the challenge by selecting AUTHENTICATED in the ACS emulator. Delegates to Challenge3dsPage.selectSuccessChallengeAmex inside the popup context. */
  | { action: 'checkout.3ds.complete3DSChallengeAmex'; stepName?: string }
  /** Completes the Stripe 3DS popup challenge. Picks up a popup already open in the context, or waits up to 45s for one to open. */
  | { action: 'checkout.3ds.complete3DSChallengeStripe'; stepName?: string }
  /** Waits for the Stripe 3DS popup window, completes the challenge, but keeps the popup open so PurchaseStatusView assertions can run before closing. Must be followed by closePurchaseStatusPopup after assertions. */
  | { action: 'checkout.3ds.complete3DSChallengeStripeKeepOpen'; stepName?: string }
  /** Waits for the Unlimit 3DS popup window, then completes the challenge by clicking success in the popup context. Use this action instead of selectSuccessChallengeUnlimit when render_3ds_strategy is redirect. */
  | { action: 'checkout.3ds.complete3DSChallengeUnlimit'; stepName?: string }
  /** Waits for the Stripe 3DS popup window, then completes the challenge with a failure result by clicking fail in the popup context. Use this action instead of selectFailChallengeStripe when render_3ds_strategy is redirect. */
  | { action: 'checkout.3ds.complete3DSFailChallengeStripe'; stepName?: string }
  /** Waits for the Cybersource 3DS popup window the Payment Widget opens (render_3ds_strategy redirect), then completes the challenge in it by filling the OTP code (1234) in the cardinal step-up iframe. Picks up a popup that is already open, so it is safe to call after checkout.paymentWidget.clickOnPayButton. Use this action instead of selectSuccessChallengeCybersource, which acts on the main page. */
  | { action: 'checkout.3ds.completeChallengeCybersourcePopup'; stepName?: string }
  /** Completes the Redsys 3DS challenge by selecting the denied/failure radio option and submitting. */
  | { action: 'checkout.3ds.selectDeniedChallengeRedsys'; stepName?: string }
  /** Completes the Stripe 3DS challenge with a failure result by polling all frames for the fail button and clicking it via JS evaluate. */
  | { action: 'checkout.3ds.selectFailChallengeStripe'; stepName?: string }
  /** Completes the Fiserv 3DS challenge with a failure result by clicking the no button. */
  | { action: 'checkout.3ds.selectFailedChallengeFiserv'; stepName?: string }
  /** Completes the Globalpay 3DS challenge with a failure result, then clicks redirect. */
  | { action: 'checkout.3ds.selectFailedChallengeGlobalpay'; stepName?: string }
  /** Completes the Unlimit 3DS challenge with a failure result by clicking the failure button. */
  | { action: 'checkout.3ds.selectFailedChallengeUnlimit'; stepName?: string }
  /** Completes the Stripe 3DS challenge by polling all frames for the authorize button and clicking it via JS evaluate to overcome cross-origin iframe restrictions. */
  | { action: 'checkout.3ds.selectPassChallengeStripe'; stepName?: string }
  /** Completes the Stripe 3DS challenge within the APM redirect modal by navigating the nested iframe chain (apm-redirect-iframe > Stripe iframe > challengeFrame) and clicking authorize. */
  | { action: 'checkout.3ds.selectPassChallengeStripeAPMModal'; stepName?: string }
  /** Completes the Stripe 3DS challenge inline (polling all frames on the current page) without closing the page. Use this for PaymentWidget flows where 3DS appears inside the widget iframe instead of a popup. Stores reference for PurchaseStatusView assertions. */
  | { action: 'checkout.3ds.selectPassChallengeStripeKeepOpen'; stepName?: string }
  /** Completes the Credibanco 3DS challenge by clicking only the redirect/back-to-merchant button. */
  | { action: 'checkout.3ds.selectRedirectChallengeCredibanco'; stepName?: string }
  /** Completes the Amex 3DS challenge by selecting AUTHENTICATED in the ACS emulator iframe and submitting. */
  | { action: 'checkout.3ds.selectSuccessChallengeAmex'; stepName?: string }
  /** Completes the Credibanco 3DS challenge by clicking the success button and then the redirect button. */
  | { action: 'checkout.3ds.selectSuccessChallengeCredibanco'; stepName?: string }
  /** Completes the Cybersource 3DS challenge by filling the OTP code (1234) and clicking submit within the cardinal step-up iframe. */
  | { action: 'checkout.3ds.selectSuccessChallengeCybersource'; stepName?: string }
  /** Completes the Evopayments 3DS challenge by selecting AUTHENTICATED in the ACS emulator frame and submitting. */
  | { action: 'checkout.3ds.selectSuccessChallengeEvopayments'; stepName?: string }
  /** Completes the Fiserv 3DS challenge by clicking the yes/success button. */
  | { action: 'checkout.3ds.selectSuccessChallengeFiserv'; stepName?: string }
  /** Completes the Globalpay 3DS challenge by clicking the success button then the redirect button. */
  | { action: 'checkout.3ds.selectSuccessChallengeGlobalpay'; stepName?: string }
  /** Completes the Kushki 3DS challenge by filling the OTP code (1234) and clicking the send button within the challenge iframe. */
  | { action: 'checkout.3ds.selectSuccessChallengeKushki'; stepName?: string }
  /** Completes the MIT 3DS challenge by filling the security code (555) and clicking submit. */
  | { action: 'checkout.3ds.selectSuccessChallengeMIT'; stepName?: string }
  /** Completes the OpenPay 3DS challenge by typing the security code (123456) and clicking the send button. */
  | { action: 'checkout.3ds.selectSuccessChallengeOpenPay'; stepName?: string }
  /** Completes the Paymentez 3DS challenge by clicking the success authentication button and then the redirect button. */
  | { action: 'checkout.3ds.selectSuccessChallengePaymentez'; stepName?: string }
  /** Completes the Placetopay 3DS challenge by filling the OTP code (123456), submitting, and clicking Next within the challenge iframe. */
  | { action: 'checkout.3ds.selectSuccessChallengePlacetopay'; stepName?: string }
  /** Completes the Powertranz 3DS challenge by filling the password field (3ds2) and clicking the submit button. */
  | { action: 'checkout.3ds.selectSuccessChallengePowertranz'; stepName?: string }
  /** Completes the Redsys 3DS challenge by selecting the success radio option and submitting. */
  | { action: 'checkout.3ds.selectSuccessChallengeRedsys'; stepName?: string }
  /** Completes the Unlimit 3DS challenge by clicking the success button. */
  | { action: 'checkout.3ds.selectSuccessChallengeUnlimit'; stepName?: string }
  /** Completes the Amex 3DS challenge with UNAUTHENTICATED result, simulating a failed authentication. */
  | { action: 'checkout.3ds.selectWrongChallengeAmex'; stepName?: string }
  /** Toggles the Redsys deny challenge radio input, switching the selected challenge outcome to the failure option. */
  | { action: 'checkout.3ds.toggleDenyChallenge'; stepName?: string }
  /** Waits for the explore-deuna merchant success page after the redirect engine completes. */
  | { action: 'checkout.apm.fintoc.assertExploreSuccessPage'; stepName?: string }
  /** Asserts that Fintoc info title and subtitle are visible in the widget. */
  | { action: 'checkout.apm.fintoc.assertFintocInfoVisible'; stepName?: string }
  /** Waits for the embedded Fintoc wizard to appear inside the payment widget iframe and verifies the bank selection screen is ready. Despite the legacy name ("popup"), Fintoc now runs fully embedded. */
  | { action: 'checkout.apm.fintoc.assertFintocPopupVisible'; stepName?: string }
  /** Asserts the checkout widget iframe has closed (hidden) after dismissing the embedded Fintoc view via the back button in the forms flow. */
  | { action: 'checkout.apm.fintoc.assertWidgetClosed'; stepName?: string }
  /** Clicks the back button in the EmbeddedApmModal header (TopBar). Used to dismiss the embedded Fintoc view and trigger widget close in the forms flow. The EmbeddedApmModal's TopBar button has no data-testid (TopBar.tsx renders Icon without one). We navigate via XPath from the iframe container to find the button in the preceding sibling (modal header Flex). getByTestId('arrow_back_ios') would find the wrong button — the Areas/Top.tsx one that is hidden behind the modal. */
  | { action: 'checkout.apm.fintoc.clickEmbeddedBack'; stepName?: string }
  /** Clicks the Pay button. Fintoc will load its wizard inside the embedded APM iframe — no popup interaction needed. */
  | { action: 'checkout.apm.fintoc.clickPayForm'; stepName?: string }
  /** No-op — kept for DSL compatibility. Fintoc no longer uses a popup window. */
  | { action: 'checkout.apm.fintoc.closeFintocPopup'; stepName?: string }
  /** Handles Fintoc second-factor: coordinates (3 inputs), SMS OTP (4 inputs), or mobile-app auth (no inputs — returns immediately). All variants run inside the wizard iframe. */
  | { action: 'checkout.apm.fintoc.completeSecondFactor'; stepName?: string }
  /** Fills RUT and password in the Fintoc login screen and submits. */
  | { action: 'checkout.apm.fintoc.login'; stepName?: string; params: FintocLoginParams }
  /** Waits up to 30s for the Fintoc account selection screen and clicks Continuar. */
  | { action: 'checkout.apm.fintoc.selectAccountAndContinue'; stepName?: string }
  /** Selects a bank by name in the Fintoc bank selection screen. */
  | { action: 'checkout.apm.fintoc.selectBank'; stepName?: string; params: FintocSelectBankParams }
  /** Selects Fintoc in the forms payment method list and opens the embedded checkout. */
  | { action: 'checkout.apm.fintoc.selectFintocForm'; stepName?: string }
  /** No-op — kept for DSL compatibility. Fintoc no longer uses a popup window. */
  | { action: 'checkout.apm.fintoc.waitForFintocPopupClose'; stepName?: string }
  /** Intercepts the purchase request and injects the installment plan option ID into the payment source payload. */
  | { action: 'checkout.apm.nupay.addInstallmentsToPurchaseRequest'; stepName?: string; params: AddInstallmentsParams }
  /** Asserts the order status returned in the NuPay purchase response, checking the HTTP status code and the order payment status. Returns the payment token from the request. */
  | { action: 'checkout.apm.nupay.assertOrderStatusRequestPurchase'; stepName?: string; params: AssertOrderStatusParams }
  /** Registers the consent success listener and clicks the Assign Consent button on the NuPay form to trigger the consent request. The listener only matches a consent response belonging to the expected order; orderToken and orderId default to the order from a previous setup.order action. */
  | { action: 'checkout.apm.nupay.clickAssignConsent'; stepName?: string; params?: ExpectedOrderParams }
  /** Adds installments to the purchase request and clicks the Pay button on the NuPay form. */
  | { action: 'checkout.apm.nupay.clickPay'; stepName?: string; params: ClickPayParams }
  /** Waits for a successful consent response and then clicks the Select Payment Method button on the NuPay form. */
  | { action: 'checkout.apm.nupay.clickSelectPaymentMethod'; stepName?: string }
  /** Performs the full sequence of selecting the NuPay form, filling the identity document, and clicking Assign Consent. Registers the consent success listener before the click so a later clickSelectPaymentMethod can await it. orderToken and orderId default to the order from a previous setup.order action. */
  | { action: 'checkout.apm.nupay.fillDocumentAndClickAssignConsent'; stepName?: string; params: FillDocumentAndConsentParams }
  /** Fills in the identity document (CPF) field in the NuPay form. */
  | { action: 'checkout.apm.nupay.fillIdentityDocument'; stepName?: string; params: FillIdentityDocumentParams }
  /** Waits for the payment methods response and extracts the plan option ID for the given installment count and payment method type. */
  | { action: 'checkout.apm.nupay.getPlanOptionIdForInstallments'; stepName?: string; params: GetPlanOptionIdParams }
  /** Scrolls to and selects the NuPay credit payment method option in the checkout form. */
  | { action: 'checkout.apm.nupay.selectNupayForm'; stepName?: string }
  /** Selects a specific NuPay payment method option (NuPay Credit or NuPay Debit) from the dropdown. */
  | { action: 'checkout.apm.nupay.selectPaymentMethodOption'; stepName?: string; params: SelectPaymentMethodOptionParams }
  /** Waits for a pending consent response and validates that the consent is pending, with the correct order token and transaction ID, indicating the user has no NuPay account. */
  | { action: 'checkout.apm.nupay.validateConsentCPFWithoutNupayAccount'; stepName?: string; params: ValidateConsentCPFParams }
  /** Waits for the consent failure response and validates that the error code corresponds to an invalid CPF (DP-4025). */
  | { action: 'checkout.apm.nupay.validateErrorInvalidCPF'; stepName?: string }
  /** Waits for the consent failure response and validates that the error code corresponds to a missing document (DP-4030). */
  | { action: 'checkout.apm.nupay.validateErrorWithoutCPF'; stepName?: string }
  /** Waits for the NuPay payment methods response and validates that both nupay_credit and nupay_debit methods are present with the expected installment options. */
  | { action: 'checkout.apm.nupay.validateGetPaymentMethodsResponse'; stepName?: string }
  /** Waits for a POST consent response where the consent status is failed and returns the response object. */
  | { action: 'checkout.apm.nupay.waitForConsentFailureResponse'; stepName?: string }
  /** Waits for a GET consent response where the consent status is pending and returns the response object. */
  | { action: 'checkout.apm.nupay.waitForConsentPendingResponse'; stepName?: string }
  /** Asserts the order status returned in the OXXO purchase response, checking the HTTP status code and the order payment status. */
  | { action: 'checkout.apm.oxxo.assertOrderStatus'; stepName?: string; params: AssertOrderStatusParams }
  /** Clicks the Pay button on the OXXO form and waits for the purchase response. */
  | { action: 'checkout.apm.oxxo.clickPay'; stepName?: string }
  /** Selects the OXXO payment method option in the checkout form. */
  | { action: 'checkout.apm.oxxo.selectOxxoForm'; stepName?: string }
  /** Asserts that the phone number input field is visible on the PSE form. */
  | { action: 'checkout.apm.pse.assertPhoneNumberVisible'; stepName?: string }
  /** Clicks the Go To Site button in the PSE form to proceed to the bank redirection. */
  | { action: 'checkout.apm.pse.clickGoToSiteButton'; stepName?: string }
  /** Enters the personal details (email) on the PSE bank redirection page and clicks continue to the bank. */
  | { action: 'checkout.apm.pse.enterPersonalDetails'; stepName?: string }
  /** Fills in the account holder name field in the PSE form. */
  | { action: 'checkout.apm.pse.fillHolderName'; stepName?: string; params: { holderName: string } }
  /** Fills in the phone number field in the PSE form. */
  | { action: 'checkout.apm.pse.fillPhoneNumber'; stepName?: string; params: { phone: string } }
  /** Fills in all fields of the PSE form including financial institution, document, person type, holder name, and phone number. */
  | { action: 'checkout.apm.pse.fillPseForm'; stepName?: string; params: FillPseFormParams }
  /** Fills in the user document (ID number) field in the PSE form. */
  | { action: 'checkout.apm.pse.fillUserDocument'; stepName?: string; params: { document: string } }
  /** Processes the PSE bank redirection flow, filling in transfer details and redirecting back to the merchant. Accepts an optional status parameter (default APPROVED). */
  | { action: 'checkout.apm.pse.processRedirection'; stepName?: string; params?: { status?: string } }
  /** Selects a financial institution from the PSE form dropdown by bank name. */
  | { action: 'checkout.apm.pse.selectFinancialInstitution'; stepName?: string; params: { bankName: string } }
  /** Selects the natural person type in the PSE form dropdown. */
  | { action: 'checkout.apm.pse.selectPersonType'; stepName?: string }
  /** Waits for the Go To Site button to become visible in the PSE payment widget. */
  | { action: 'checkout.apm.pse.waitGoToSiteButtonVisible'; stepName?: string }
  /** Awaits the Addi redirect popup opened by clickPayForm and asserts its landing page is visible. */
  | { action: 'checkout.bnpl.addi.assertAddiPopupVisible'; stepName?: string }
  /** Asserts that the PSE payment form is visible on the Addi redirect page. */
  | { action: 'checkout.bnpl.addi.assertPaymentFormVisible'; stepName?: string }
  /** Asserts that field validation error messages are visible in the embedded Addi reference form. */
  | { action: 'checkout.bnpl.addi.assertReferenceFormValidationErrors'; stepName?: string }
  /** Asserts that the remote translations response previously registered by waitRemoteTranslations is non-empty. */
  | { action: 'checkout.bnpl.addi.assertRemoteTranslations'; stepName?: string }
  /** Clicks the cancel icon and confirms exit to cancel the Addi purchase flow. */
  | { action: 'checkout.bnpl.addi.cancelPurchase'; stepName?: string }
  /** Clicks "Embedir Pago" to embed the Addi reference form inline in the Formularios view, hides the footer overlay, scrolls to the embed container, and waits for the embedded reference form to be visible. */
  | { action: 'checkout.bnpl.addi.clickEmbedPay'; stepName?: string }
  /** Clicks the Pay button in the Formularios Addi flow. Also sets up a popup listener to capture the Addi redirect popup that opens after submission. */
  | { action: 'checkout.bnpl.addi.clickPayForm'; stepName?: string }
  /** Clicks the Pay button in the Addi reference data modal and asserts the purchase response. */
  | { action: 'checkout.bnpl.addi.clickReferenceModalPay'; stepName?: string }
  /** Fills the Addi customer reference data form embedded inline in the Formularios view (document, phone, address, department, city). */
  | { action: 'checkout.bnpl.addi.fillReferenceModal'; stepName?: string }
  /** Fills the PSE payment form with test user data including full name, ID number, and email. */
  | { action: 'checkout.bnpl.addi.fillUserData'; stepName?: string }
  /** Injects a no-op Android WebView bridge (window.android) via page.addInitScript so the checkout can detect a native mobile environment. Must be called before navigation. */
  | { action: 'checkout.bnpl.addi.injectMobileBridge'; stepName?: string }
  /** Waits for the Addi landing page to fully load, asserts the heading is visible, and clicks the continue button. */
  | { action: 'checkout.bnpl.addi.seeAddiLandingPageAndContinue'; stepName?: string }
  /** Selects the Addi option in the Formularios payment methods list. */
  | { action: 'checkout.bnpl.addi.selectAddiForm'; stepName?: string }
  /** Opens the bank selector and chooses the bank that approves the transaction for testing approved flow. */
  | { action: 'checkout.bnpl.addi.selectApproveBank'; stepName?: string }
  /** Clicks the debit with PSE option on the Addi payment method selection screen. */
  | { action: 'checkout.bnpl.addi.selectDebitWithPSE'; stepName?: string }
  /** Opens the bank selector and chooses the bank that declines the transaction for testing declined flow. */
  | { action: 'checkout.bnpl.addi.selectDeclineBank'; stepName?: string }
  /** Opens the bank selector and chooses the bank that simulates an error for testing error flow. */
  | { action: 'checkout.bnpl.addi.selectErrorBank'; stepName?: string }
  /** Clicks the pay with PSE button to submit the payment form. */
  | { action: 'checkout.bnpl.addi.sendPayment'; stepName?: string }
  /** Clicks the Pay button of the embedded Addi reference form with no data filled, to trigger field validation errors. */
  | { action: 'checkout.bnpl.addi.submitEmptyReferenceForm'; stepName?: string }
  /** Captures a visual snapshot of the embedded Addi reference form (inline in Formularios, not a popup) across the specified viewport set. */
  | { action: 'checkout.bnpl.addi.verifyFormVisualConsistency'; stepName?: string; params: { snapshotName: string; viewports?: "all" | "desktopOnly" | "phoneOnly" | "tabletOnly" | "desktopAndFullscreen" | "mobileAndTablet" } }
  /** Waits for the Addi popup page to close, with an optional timeout in milliseconds. */
  | { action: 'checkout.bnpl.addi.waitForClose'; stepName?: string; params?: { timeout?: number } }
  /** Registers a watcher for the remote translations response for the given project and language. Pair with assertRemoteTranslations after the request completes. */
  | { action: 'checkout.bnpl.addi.waitRemoteTranslations'; stepName?: string; params: WaitRemoteTranslationsParams }
  /** Asserts that the processing order label is visible, confirming the order is being processed. */
  | { action: 'checkout.bnpl.aplazo.assertProcessingOrder'; stepName?: string }
  /** Waits for the Aplazo redirect popup to open, then asserts that the pulsing-dots processing view is visible in the checkout iframe on the main page. */
  | { action: 'checkout.bnpl.aplazo.assertPulsingDotsVisible'; stepName?: string }
  /** Asserts that the purchase rejected title is visible on the Aplazo redirect page. */
  | { action: 'checkout.bnpl.aplazo.assertRejectedPage'; stepName?: string }
  /** Clicks the buy/confirm purchase button on the Aplazo redirect page. */
  | { action: 'checkout.bnpl.aplazo.clickButtonBuy'; stepName?: string }
  /** Registers a popup listener and clicks the Pay button in the Formularios Aplazo flow. The popup (Aplazo redirect page) is captured for use by assertPulsingDotsVisible and closePopup. */
  | { action: 'checkout.bnpl.aplazo.clickPayAndWaitForPopup'; stepName?: string }
  /** Clicks the back-to-store button on the Aplazo redirect page. */
  | { action: 'checkout.bnpl.aplazo.clickStoreBackButton'; stepName?: string }
  /** Closes the Aplazo redirect page. */
  | { action: 'checkout.bnpl.aplazo.closePage'; stepName?: string }
  /** Closes the Aplazo redirect popup that was opened by clickPayAndWaitForPopup. */
  | { action: 'checkout.bnpl.aplazo.closePopup'; stepName?: string }
  /** Selects the Aplazo payment method in the Formularios experience. */
  | { action: 'checkout.bnpl.aplazo.selectForm'; stepName?: string }
  /** Fills the phone number input on the Aplazo redirect page and clicks continue. Defaults to a test phone number if none is provided. */
  | { action: 'checkout.bnpl.aplazo.sendPhoneNumber'; stepName?: string; params?: { phoneNumber?: string } }
  /** Fills each digit of the OTP into the Aplazo verification input fields. Defaults to 123456 if no OTP is provided. */
  | { action: 'checkout.bnpl.aplazo.verifyOTP'; stepName?: string; params?: { otp?: string } }
  /** Asserts that the purchase rejected title is visible on the Kueskipay redirect page. */
  | { action: 'checkout.bnpl.kueski.assertRejectedPage'; stepName?: string }
  /** Clicks the buy button on the Kueskipay redirect page. */
  | { action: 'checkout.bnpl.kueski.clickButtonBuy'; stepName?: string }
  /** Clicks the back-to-store button on the Kueskipay redirect page. */
  | { action: 'checkout.bnpl.kueski.clickStoreBackButton'; stepName?: string }
  /** Closes the Kueskipay redirect page. */
  | { action: 'checkout.bnpl.kueski.closePage'; stepName?: string }
  /** Fills the Kueskipay username and password fields with test credentials and clicks the login button. */
  | { action: 'checkout.bnpl.kueski.completeLoginAction'; stepName?: string }
  /** Navigates to the admin order details page and asserts the payment status, processor name, installments number, and payment method. */
  | { action: 'checkout.bnpl.paypalPayLater.assertOrderDetails'; stepName?: string; params: { installments: number; expectedStatus?: "failed" | "pending" | "processing" | "processed" | "denied" | "authorized" | "authorizing" | "pending_3ds" | "voided" | "partial_refunded" | "partial_refunding" | "refunded" | "refunding" | "captured" | "capturing" | "partial_capturing" | "partial_captured" | "cancelled"; expectedPaymentMethod?: "debit" | "credit" | "debit_card" | "bnpl" | "credit_card" | "voucher" | "wallet" | "bank_transfer"; orderToken?: string; merchantId?: string } }
  /** Asserts that the processing view is displayed in the checkout payment page. */
  | { action: 'checkout.bnpl.paypalPayLater.assertProcessingView'; stepName?: string }
  /** Asserts that the thank you page with the expected text is displayed. */
  | { action: 'checkout.bnpl.paypalPayLater.assertThankyouPage'; stepName?: string; params: { text: string } }
  /** Clicks on the PayPal SPB pay button and waits for the PayPal Pay Later popup to open. */
  | { action: 'checkout.bnpl.paypalPayLater.clickPayButtonAndOpenPaypal'; stepName?: string }
  /** Clicks on the pay button inside the PayPal popup. */
  | { action: 'checkout.bnpl.paypalPayLater.clickPayInPaypal'; stepName?: string }
  /** Awaits the PayPal popup and logs in with sandbox credentials. */
  | { action: 'checkout.bnpl.paypalPayLater.loginInPaypal'; stepName?: string }
  /** Selects the card to process the payment inside the PayPal popup. */
  | { action: 'checkout.bnpl.paypalPayLater.selectCardInPaypal'; stepName?: string }
  /** Selects PayPal Pay Later as payment method and clicks the pay button on the checkout form. */
  | { action: 'checkout.bnpl.paypalPayLater.selectPaypalPayLaterForm'; stepName?: string }
  /** Fills the email field with the given address (handling already-logged-in sessions) and clicks the Continue button to advance the checkout flow. */
  | { action: 'checkout.email.enterEmailAndContinue'; stepName?: string; params: EnterEmailParams }
  /** Asserts that the email input is visible in the checkout widget, verifying the email step is rendered. */
  | { action: 'checkout.email.validateEmail'; stepName?: string }
  /** Clicks the Pagar button and sets up a response listener for the purchase transaction. Pass isPurchaseV1=true for V1 purchase flow, or omit/false for V2 flow. Use this action instead of checkout.paymentWidget.clickPay when experienceType is Formularios. */
  | { action: 'checkout.forms.clickFinalizePurchase'; stepName?: string; params?: { isPurchaseV1?: boolean } }
  /** Fills the credit card data in the Formularios experience using direct DOM selectors (card number, expiration date, CVV). Use this action instead of checkout.paymentWidget.fillCreditCardData when experienceType is Formularios. */
  | { action: 'checkout.forms.fillCreditCardData'; stepName?: string; params: { creditCardData: BaseCreditCard } }
  /** Asserts that the MSI installments dropdown is visible, confirming that installment options have loaded in the payment widget. */
  | { action: 'checkout.installments.assertInstallmentsLoaded'; stepName?: string }
  /** Waits for the installments API response and verifies that the expected installment count is present in the returned plans. */
  | { action: 'checkout.installments.assertInstallmentsResponse'; stepName?: string; params: AssertInstallmentsResponseParams }
  /** Selects the given number of MCI (meses con intereses) installments from the dropdown in the checkout payment widget. */
  | { action: 'checkout.installments.selectMCI'; stepName?: string; params: SelectInstallmentsParams }
  /** Selects the given number of MSI (meses sin intereses) installments from the dropdown in the checkout payment widget. */
  | { action: 'checkout.installments.selectMSI'; stepName?: string; params: SelectInstallmentsParams }
  /** Asserts that the Go to Site button is visible on the Next Action page. Waits for the checkout iframe to mount first, then checks the button. Default timeout is 20s, pass a higher value for slow flows like 3DS redirect. */
  | { action: 'checkout.nextAction.assertGoToSiteButtonVisible'; stepName?: string; params?: { timeout?: number } }
  /** Clicks the Go to Site button on the Next Action page. Waits up to 40 seconds for the button to be visible and clickable. */
  | { action: 'checkout.nextAction.clickGoToSiteButton'; stepName?: string }
  /** Navigates to the Explore page and opens the requested experience. Pass vaultWebSdkConfig.withInitNextAction=true for Vault (Web SDK) flows that need to transition to the Next Action widget after purchase (e.g. 3DS). Pass antiFraudProviders to enable fraud providers in the explore sidebar (e.g. { MERCADOPAGO: {} }). publicKey, privateKey, orderToken and userToken are resolved from a previous setup.merchant / setup.order action when omitted; pass them (or ref()) to make the dependency explicit. */
  | { action: 'checkout.openCheckout'; stepName?: string; params: OpenCheckoutParams }
  | { action: 'checkout.openCheckoutWidgetFromCatalog'; stepName?: string; params?: { publicKey?: string; privateKey?: string } }
  /** Asserts that the current page URL matches the redirect URL for the given status (close, success, pending, error, fallback). */
  | { action: 'checkout.paymentLink.assertCurrentPageIsRedirectStatusUrl'; stepName?: string; params: AssertRedirectStatusParams }
  /** Asserts that the CVV input for a registered (saved) card is visible on the payment link page. */
  | { action: 'checkout.paymentLink.assertCvvInputVisible'; stepName?: string }
  /** Asserts the purchase response HTTP status code and the order payment status in the response body. */
  | { action: 'checkout.paymentLink.assertOrderStatusRequestPurchase'; stepName?: string; params: AssertOrderStatusParams }
  /** Asserts that the saved-cards view is visible on the payment link page (selected-card-last-four element is shown). Unlike the payment widget, payment link renders directly on the page without an iframe. */
  | { action: 'checkout.paymentLink.assertSavedCardsVisible'; stepName?: string }
  /** Asserts the thank-you page title text after a successful payment on the payment link page. */
  | { action: 'checkout.paymentLink.assertThankyouPage'; stepName?: string; params: AssertThankyouPageParams }
  /** Clicks the pay button on the payment link page and waits for the purchase response. */
  | { action: 'checkout.paymentLink.clickPay'; stepName?: string }
  /** Fills the credit card form fields directly on the payment link page (no iframe). Optionally resolves the document number by country code. */
  | { action: 'checkout.paymentLink.fillCreditCardData'; stepName?: string; params: FillCreditCardParams }
  /** Fills the CVV input for a pre-selected saved card on the payment link page. */
  | { action: 'checkout.paymentLink.fillCvvCode'; stepName?: string; params: { cvv: string } }
  /** Clicks the sign-out button and confirms the logout on the payment link page. */
  | { action: 'checkout.paymentLink.logout'; stepName?: string }
  /** Fills the coupon input and submits it on the payment link page. */
  | { action: 'checkout.paymentLink.redeemCoupon'; stepName?: string; params: RedeemCouponParams }
  /** Clicks the see-all-cards button to display the full list of saved cards on the payment link page. */
  | { action: 'checkout.paymentLink.seeAllCards'; stepName?: string }
  /** Selects a saved card by last four digits and fills the CVV input on the payment link page. */
  | { action: 'checkout.paymentLink.selectAndFillCvvSavedCard'; stepName?: string; params: SelectAndFillCvvParams }
  /** Opens the MSI installments dropdown and selects the given installment quantity on the payment link page. */
  | { action: 'checkout.paymentLink.selectInstallmentsMSI'; stepName?: string; params: SelectInstallmentsParams }
  /** Selects a saved card from the payment link saved-cards list by matching on the last four digits of the provided card number. */
  | { action: 'checkout.paymentLink.selectSavedCard'; stepName?: string; params: SelectSavedCardParams }
  /** Asserts the billing Address (address1) input's border resolves to the expected hex color. */
  | { action: 'checkout.paymentWidget.assertAddress1BorderColor'; stepName?: string; params: AssertAddress1BorderColorParams }
  /** Asserts the given billing dropdown's (country/state/city) trigger border resolves to the expected hex color. */
  | { action: 'checkout.paymentWidget.assertBillingDropdownBorderColor'; stepName?: string; params: AssertBillingDropdownBorderColorParams }
  /** Asserts that the purchase request payload contains a base64-encoded device_id and that the decoded value includes the uppercased provider name(s) (e.g. ["kount"] → searches for "KOUNT" in the decoded device_id). Reads device_id from anti_fraud_info.device.id (V2) or device_id (V1). */
  | { action: 'checkout.paymentWidget.assertDeviceIdInPurchaseRequest'; stepName?: string; params: { antiFraudProvider: string[] } }
  /** Asserts that the iframe-based 3DS challenge container is visible inside the payment widget. Use for 3DS flows configured with render_3ds_strategy=iframe. */
  | { action: 'checkout.paymentWidget.assertIframe3dsVisible'; stepName?: string }
  /** Asserts the order status in the purchase request. Waits for the purchase response and checks the status code and order status in the request body. Optionally disables body verification. */
  | { action: 'checkout.paymentWidget.assertOrderStatusRequestPurchase'; stepName?: string; params: AssertOrderStatusParams }
  /** Asserts that the purchase request payload contains processor_name (V1) or payment_source.processor (V2) equal to the expected value. */
  | { action: 'checkout.paymentWidget.assertProcessorNameInPurchaseRequest'; stepName?: string; params: { expectedProcessorName: string } }
  /** Asserts the authenticated user saved card is preselected on widget load (selected-card-last-four is visible). */
  | { action: 'checkout.paymentWidget.assertSavedCardIsPreselected'; stepName?: string }
  /** Asserts that the saved-cards view is visible inside the payment widget (selected-card-last-four element is shown), confirming the user session is active and saved cards are displayed. */
  | { action: 'checkout.paymentWidget.assertSavedCardsVisible'; stepName?: string }
  /** Asserts that the card payment form (label) is visible in the payment widget iframe. */
  | { action: 'checkout.paymentWidget.assertUserSeePaymentForm'; stepName?: string }
  /** Clicks "Agregar una tarjeta" to leave the saved-card (UserCard) flow and show the new-card form. */
  | { action: 'checkout.paymentWidget.clickAddNewCard'; stepName?: string }
  /** Clicks the clear (X) button next to the given card form field (cardNumber, expDate, documentNumber, holderName or cvv). */
  | { action: 'checkout.paymentWidget.clickClosestClearButton'; stepName?: string; params: ClickClosestClearButtonParams }
  /** Clicks the pay button and returns immediately WITHOUT blocking on the purchase response. With withResponse=true (default) the response listener is armed before the click so a later action can await it; use withResponse=false for 3DS redirect and iframe flows where the challenge must be handled first. To block until the payment finishes, use clickPay instead. */
  | { action: 'checkout.paymentWidget.clickOnPayButton'; stepName?: string; params?: ClickPayParams }
  /** Clicks the pay button and BLOCKS until the purchase response and card creation complete. This is the default for straight-through payments. For flows that must act on the page before the response arrives (3DS popup or iframe), use clickOnPayButton instead. */
  | { action: 'checkout.paymentWidget.clickPay'; stepName?: string }
  /** Closes the Payment Widget via the back-action arrow and reopens it through the experience type modal. Workaround for an external bug where the first widget open does not include device_id in the purchase request payload — the reopen makes the SDK emit device_id on the next purchase. */
  | { action: 'checkout.paymentWidget.closeAndReopenPaymentWidget'; stepName?: string }
  /** Completes the Unlimit 3DS challenge rendered inside the payment widget iframe and asserts the card creation response. Use for Unlimit/Payconnect flows configured with render_3ds_strategy=iframe. */
  | { action: 'checkout.paymentWidget.completeUnlimit3DSInIframe'; stepName?: string }
  /** Waits for the OTP screen to appear inside the payment widget and enters the OTP code. Defaults to 010101 if no code is provided. */
  | { action: 'checkout.paymentWidget.enterOtpCode'; stepName?: string; params?: { code?: string } }
  /** Fills the Address (address1) input in the billing form. */
  | { action: 'checkout.paymentWidget.fillBillingAddress1'; stepName?: string; params: FillBillingAddress1Params }
  /** Fills only the credit card number input in the payment widget, leaving other fields empty. */
  | { action: 'checkout.paymentWidget.fillCardNumber'; stepName?: string; params: FillCardNumberParams }
  /** Fills the credit card data in the payment widget. Optionally waits for installments to load before filling the data. */
  | { action: 'checkout.paymentWidget.fillCreditCardData'; stepName?: string; params: FillCreditCardParams }
  /** Logs out the current user inside the payment widget iframe: clicks the "Cerrar sesión" button and then confirms by clicking "Confirmar" in the confirmation modal. */
  | { action: 'checkout.paymentWidget.logout'; stepName?: string }
  /** Selects the given billing dropdown's option (country: Mexico; state/city: the mocked Bogotá D.C. option) and blurs the search input afterward. The blur is required — the design system keeps focus on the search input after a click (onMouseDown: preventDefault), and a focused dropdown reads as "focused" (blue) instead of "selectedValid" (green) regardless of the underlying value. */
  | { action: 'checkout.paymentWidget.selectBillingDropdownOption'; stepName?: string; params: SelectBillingDropdownOptionParams }
  /** Opens the installments dropdown and selects the "no installments" option to deselect a previously chosen plan. */
  | { action: 'checkout.paymentWidget.selectInstallmentDeselected'; stepName?: string }
  /** Clicks whichever billing button variant ("Agregar datos" or "Cambiar") is currently visible, opening the billing form. */
  | { action: 'checkout.paymentWidget.showBillingForm'; stepName?: string }
  /** Asserts that no card form validation errors (card number, expiration date, cvv, holder name, document number) are visible. */
  | { action: 'checkout.paymentWidget.userDoesNotSeeErrors'; stepName?: string }
  /** Asserts that the installments dropdown is not visible in the payment widget. */
  | { action: 'checkout.paymentWidget.userDoesNotSeeInstallmentsDropdown'; stepName?: string }
  /** Asserts that the installments dropdown is visible in the payment widget. */
  | { action: 'checkout.paymentWidget.userSeesInstallmentsDropdown'; stepName?: string }
  /** Asserts that the order confirmed screen is visible by waiting for the provided message text to appear within the post-transaction iframe. */
  | { action: 'checkout.postTransaction.assertOrderConfirmed'; stepName?: string; params: AssertOrderConfirmedParams }
  /** Asserts that the thank-you post-transaction screen is visible by checking that the success message "¡Gracias por elegirnos!" is displayed. */
  | { action: 'checkout.postTransaction.assertThankYouPage'; stepName?: string }
  /** Fills the guest user data form (name, last name, phone, document identity) and clicks Continue, waiting for the register API response. */
  | { action: 'checkout.userData.fillGuestUserData'; stepName?: string; params: BaseUserData }
  /** Searches for a shipping address, selects it from results, confirms it, and clicks Continue. Supports optional apartment and city fields. */
  | { action: 'checkout.userData.fillShippingAddress'; stepName?: string; params: FillShippingAddressParams }
  | { action: 'checkout.userData.selectAddressViaGeolocation'; stepName?: string }
  /** Asserts that the pay/save button is visible and enabled in the vault widget. */
  | { action: 'checkout.vault.assertButtonEnabled'; stepName?: string }
  /** Asserts the card offers no actions at all: it is already the default one and its deletion is withheld, so no kebab is rendered. */
  | { action: 'checkout.vault.assertCardHasNoActions'; stepName?: string; params: CardByNumberParams }
  /** Asserts that the POST /cards request returned 201 and stores the returned card_id for use by subsequent assertions. */
  | { action: 'checkout.vault.assertCardRequest'; stepName?: string }
  /** Opens the card actions menu and asserts the Eliminar entry is not offered, while the menu itself stays usable. */
  | { action: 'checkout.vault.assertDeleteOptionNotOffered'; stepName?: string; params: CardByNumberParams }
  /** Asserts that the specified event (e.g. vaultSaveSuccess) has been fired by the vault widget. */
  | { action: 'checkout.vault.assertEventWasFired'; stepName?: string; params: AssertEventWasFiredParams }
  /** Asserts the purchase V2 response status and that the order status matches expected. When useStoredCardId is true, also asserts the request payload references the card_id captured by the most recent assertCardRequest call. */
  | { action: 'checkout.vault.assertOrderStatusRequestPurchaseV2'; stepName?: string; params: AssertOrderStatusPurchaseV2Params }
  /** Asserts that the purchase V2 request payload contains the installment object. */
  | { action: 'checkout.vault.assertPurchaseSendInstallmentObject'; stepName?: string }
  /** Asserts that the purchase V2 request sent the plan_option_id matching the selected installments. */
  | { action: 'checkout.vault.assertPurchaseSendProperPlanOptionId'; stepName?: string; params: AssertPurchaseSendProperPlanOptionIdParams }
  /** Asserts that the saved card with the expected last four digits is visible in the vault widget. */
  | { action: 'checkout.vault.assertSavedCardIsVisible'; stepName?: string; params: AssertSavedCardIsVisibleParams }
  /** Asserts the single-card view offers its delete button disabled, with the tooltip explaining why deletion is withheld. */
  | { action: 'checkout.vault.assertSelectedCardDeletionBlocked'; stepName?: string; params: AssertSelectedDeletionBlockedParams }
  /** Asserts the single-card view offers its delete button enabled, which is the behaviour when the merchant has not restricted deletion. */
  | { action: 'checkout.vault.assertSelectedCardDeletionOffered'; stepName?: string }
  /** Asserts that an element with the given visible text is present inside the vault widget iframe. Uses the first match by default. */
  | { action: 'checkout.vault.assertTextVisibleInIframe'; stepName?: string; params: AssertTextVisibleInIframeParams }
  /** Asserts the global transaction payment status via the order details API. Uses the given privateKey or falls back to the merchant stored in the test context. */
  | { action: 'checkout.vault.assertTransactionPaymentStatus'; stepName?: string; params: AssertTransactionPaymentStatusParams }
  /** Asserts that the terms and conditions plus privacy policy section is visible in the vault widget. */
  | { action: 'checkout.vault.assertUserSeeTermsAndConditions'; stepName?: string }
  /** Asserts that the vault widget main view title is visible, confirming that the vault widget has mounted and is showing the saved-cards screen. */
  | { action: 'checkout.vault.assertVaultVisible'; stepName?: string }
  /** Navigates from a sub-screen (e.g. billing form) back to the main card form in the vault widget. */
  | { action: 'checkout.vault.backToCardForm'; stepName?: string }
  /** Clicks the change-channel button on the OTP screen of the vault widget (e.g. switch SMS to email). */
  | { action: 'checkout.vault.clickOnChangeChannelButton'; stepName?: string }
  /** Clicks the continue-as-guest button to leave the authenticated flow after an OTP rejection. */
  | { action: 'checkout.vault.clickOnContinueAsGuest'; stepName?: string }
  /** Clicks the pay button in the vault widget. Sets up purchase V1 or V2 request/response listeners; optionally waits for the vaultSaveSuccess event. */
  | { action: 'checkout.vault.clickOnPay'; stepName?: string; params?: ClickOnPayParams }
  /** Clicks the save button in the vault widget to persist the card without completing the purchase. */
  | { action: 'checkout.vault.clickOnSave'; stepName?: string }
  /** Clicks the save button in the vault widget billing form. */
  | { action: 'checkout.vault.clickSaveBillingForm'; stepName?: string }
  /** Deletes a saved card from the list: opens its actions menu, chooses Eliminar and confirms the modal. */
  | { action: 'checkout.vault.deleteCard'; stepName?: string; params: CardByNumberParams }
  /** Deletes the card shown in the single-card view, through its kebab and the confirmation modal. */
  | { action: 'checkout.vault.deleteSelectedCard'; stepName?: string }
  /** Enters the OTP code in the vault widget OTP input. Defaults to 010101 if no code is provided. */
  | { action: 'checkout.vault.enterOtpCode'; stepName?: string; params?: EnterOtpCodeParams }
  /** Fills the card form in the vault widget with the given card data and options (e.g. country, avoidInstallmentsCall). */
  | { action: 'checkout.vault.fillCardForm'; stepName?: string; params: FillCardFormParams }
  /** Fills the CVV input in the vault widget card form. Use type=press for pressSequentially. Pass avoidInstallmentsCall=true to skip waiting for the installments response. */
  | { action: 'checkout.vault.fillCvvInCardForm'; stepName?: string; params: FillCvvInCardFormParams }
  /** Fills the vault widget card form with the given card. opts.type=press uses pressSequentially for fields; opts.country resolves the default document number for the country. */
  | { action: 'checkout.vault.fillFormVault'; stepName?: string; params: FillFormVaultParams }
  /** Fills the first name input in the vault widget billing form. */
  | { action: 'checkout.vault.fillNameBillingForm'; stepName?: string; params: FillNameBillingFormParams }
  /** Clicks the resend OTP code button to receive a new OTP through the selected channel. */
  | { action: 'checkout.vault.resendOtpCodeToChannel'; stepName?: string }
  /** Clicks the see-more-cards button in the vault widget to display the full list of saved cards. */
  | { action: 'checkout.vault.seeMoreCards'; stepName?: string }
  /** Selects the given MSI (meses sin intereses) installments option in the vault widget installments dropdown. */
  | { action: 'checkout.vault.selectInstallmentsMSI'; stepName?: string; params: SelectInstallmentsMSIParams }
  /** Selects a saved card from the vault widget by matching on the last four digits of the provided card number. */
  | { action: 'checkout.vault.selectSavedCard'; stepName?: string; params: SelectSavedCardParams }
  /** Sets a saved card as the default one from its actions menu. Cards start without a default, so a test that needs one has to establish it. */
  | { action: 'checkout.vault.setCardAsDefault'; stepName?: string; params: CardByNumberParams }
  /** Opens the billing form drawer/iframe in the vault widget. */
  | { action: 'checkout.vault.showBillingFormIFrame'; stepName?: string }
  /** Puts each card's subscriptions lookup in the state the test needs: subscribed, failing, or free of subscriptions. Install it before checkout.openCheckout — the widget queries as soon as the saved cards load — and assert on the UI, not on the response. */
  | { action: 'checkout.vault.stubSubscriptionLookups'; stepName?: string; params?: StubSubscriptionLookupsParams }
  /** Asserts that the Deuna Wallet post-purchase voucher is visible: header price, headings (header/body/due date/footer), and the rendered QR code image or 6-digit payment code (per `format`, defaults to 'qr'). */
  | { action: 'checkout.voucher.deunaWallet.assertDeunaWalletVoucher'; stepName?: string; params: { price: string; format?: "qr" | "code" } }
  /** Selects Deuna Wallet in the Formularios payment methods list and clicks the embed button. For the QR processor format this embeds the widget and triggers the purchase directly, landing on the post-purchase voucher/QR view with no further input. */
  | { action: 'checkout.voucher.deunaWallet.selectDeunaWalletForm'; stepName?: string }
  /** Captures a visual snapshot of the Deuna Wallet post-purchase voucher view (QR image or 6-digit code, left visible — only the countdown/animation is masked) across the specified viewport set. Call right after assertDeunaWalletVoucher, same as the proven ENTP1-T2561/T2562 flow — no extra waits in between, since the order moves on from this view a few seconds after it renders. */
  | { action: 'checkout.voucher.deunaWallet.verifyVoucherVisualConsistency'; stepName?: string; params: { snapshotName: string; viewports?: "all" | "desktopOnly" | "phoneOnly" | "tabletOnly" | "desktopAndFullscreen" | "mobileAndTablet" } }
  /** Reads the expiration date text from the Efecty voucher and returns it as an ISO string. */
  | { action: 'checkout.voucher.efecty.getExpirationDateIso'; stepName?: string }
  /** Asserts that the Femsa OXXO Cash voucher title, description, and reference title are all visible. */
  | { action: 'checkout.voucher.femsaOxxo.assertFemsaOxxoCashVoucher'; stepName?: string }
  /** Asserts that the Femsa OXXO Cash voucher additional info section and disclaimer text are visible. */
  | { action: 'checkout.voucher.femsaOxxo.assertFemsaOxxoCashVoucherAdditionalInfo'; stepName?: string }
  /** Asserts that the Femsa OXXO Cash voucher due date container is visible. */
  | { action: 'checkout.voucher.femsaOxxo.assertFemsaOxxoCashVoucherDueDate'; stepName?: string }
  /** Clicks the order summary button and asserts the pending payment label is visible on the Femsa OXXO Cash thank-you page. */
  | { action: 'checkout.voucher.femsaOxxo.assertFemsaOxxoCashVoucherOrderSummary'; stepName?: string }
  /** Clicks the allow button to grant Klap access to the Edenred network. */
  | { action: 'checkout.voucher.klap.allowedKlapToEdenredNetworkMe'; stepName?: string }
  /** Asserts that the Klap warning alert notification has the expected text. */
  | { action: 'checkout.voucher.klap.assertAlertNotification'; stepName?: string; params: { text: string } }
  /** Asserts that the Klap Sodexo pay button is enabled. */
  | { action: 'checkout.voucher.klap.assertButtonPayAvailable'; stepName?: string }
  /** Asserts that the Klap error message label is visible in the form iframe. */
  | { action: 'checkout.voucher.klap.assertLabelErrorMessageVisible'; stepName?: string }
  /** Asserts that the processing order label is visible in the Klap form iframe. */
  | { action: 'checkout.voucher.klap.assertLabelProcessingOrderVisible'; stepName?: string }
  /** Asserts that the processing payment label is visible in the Klap form iframe. */
  | { action: 'checkout.voucher.klap.assertLabelProcessingPaymentVisible'; stepName?: string }
  /** Asserts that the redirecting-to-site label is visible in the Klap form iframe. */
  | { action: 'checkout.voucher.klap.assertLabelRedirectingToSiteVisible'; stepName?: string }
  /** Clicks the cancel/change-method button in the Klap form and asserts the iframe is closed. */
  | { action: 'checkout.voucher.klap.cancelPurchase'; stepName?: string }
  /** Clicks the back button in the Klap form iframe. */
  | { action: 'checkout.voucher.klap.clickBack'; stepName?: string }
  /** Clicks the pay button in the Klap Sodexo payment form, handling disabled state gracefully. */
  | { action: 'checkout.voucher.klap.clickPay'; stepName?: string }
  /** Clicks the redirect-to-commerce button in the Klap Sodexo flow if visible. */
  | { action: 'checkout.voucher.klap.clickRedirectToCommerce'; stepName?: string }
  /** Fills the Klap Edenred login credentials (username and password) in the Edenred portal. */
  | { action: 'checkout.voucher.klap.fillDataToLogin'; stepName?: string }
  /** Fills the dynamic key/password input in the Klap Sodexo payment form. */
  | { action: 'checkout.voucher.klap.fillInputPassword'; stepName?: string; params?: { password?: string } }
  /** Fills the PAN (card number suffix) input in the Klap Edenred portal. */
  | { action: 'checkout.voucher.klap.fillPan'; stepName?: string; params?: { pan?: string } }
  /** Clicks the login button on the Klap Edenred portal. */
  | { action: 'checkout.voucher.klap.login'; stepName?: string }
  /** Clicks the validate button after entering the PAN in the Klap Edenred portal. */
  | { action: 'checkout.voucher.klap.validatePan'; stepName?: string }
  /** Asserts that the amount displayed in the OXXO voucher header matches the expected formatted value. */
  | { action: 'checkout.voucher.oxxo.assertAmountToPay'; stepName?: string; params: { formatedValue: string } }
  /** Asserts that the back button is visible on the OXXO error screen. */
  | { action: 'checkout.voucher.oxxo.assertBackButtonDisplayed'; stepName?: string }
  /** Asserts that the error screen back button is functional and returns to the payment method selection screen. */
  | { action: 'checkout.voucher.oxxo.assertBackButtonWorks'; stepName?: string }
  /** Asserts that the barcode canvas element is visible in the OXXO voucher. */
  | { action: 'checkout.voucher.oxxo.assertBarCodeDisplayed'; stepName?: string }
  /** Saves a downloaded PDF to disk, parses its content, and asserts it contains the expected text. */
  | { action: 'checkout.voucher.oxxo.assertContentDownloadedPdfFile'; stepName?: string; params: { download: unknown; textToVerify: string } }
  /** Asserts that the copy reference code button is visible and enabled in the OXXO voucher. */
  | { action: 'checkout.voucher.oxxo.assertCopyButtonDisplayed'; stepName?: string }
  /** Asserts that the deadline date is displayed with the expected date/time/country format in the OXXO voucher. */
  | { action: 'checkout.voucher.oxxo.assertDeadlineDateCurrentTime'; stepName?: string }
  /** Downloads the OXXO payment reference PDF and asserts that it contains the expected text. */
  | { action: 'checkout.voucher.oxxo.assertDownloadingPaymentReference'; stepName?: string; params: { textToVerify: string } }
  /** Asserts that the OXXO error code (DP-7100) is visible on the error screen. */
  | { action: 'checkout.voucher.oxxo.assertErrorIdDisplayed'; stepName?: string }
  /** Asserts that the OXXO error screen is displayed with error message and description. */
  | { action: 'checkout.voucher.oxxo.assertErrorScreen'; stepName?: string }
  /** Asserts that the OXXO voucher header title has the expected text. */
  | { action: 'checkout.voucher.oxxo.assertHeaderTitle'; stepName?: string; params: { title: string } }
  /** Expands the instructions section and asserts that all 6 payment instruction texts are displayed correctly. */
  | { action: 'checkout.voucher.oxxo.assertInstructionsTextDisplayed'; stepName?: string }
  /** Collapses the instructions section and asserts that all 6 payment instruction texts are no longer visible. */
  | { action: 'checkout.voucher.oxxo.assertInstructionsTextNotDisplayed'; stepName?: string }
  /** Clicks the payment details button and asserts the opened popup page matches the expected URL. */
  | { action: 'checkout.voucher.oxxo.assertPaymentDetails'; stepName?: string; params: { paymentDetailsUrl: string } }
  /** Asserts that the reference number is visible and not empty in the OXXO voucher. */
  | { action: 'checkout.voucher.oxxo.assertReferenceNumberDisplayed'; stepName?: string }
  /** Clicks the order summary button and asserts the pending payment label is visible on the thank-you page. */
  | { action: 'checkout.voucher.oxxo.assertThankYouPage'; stepName?: string }
  /** Clicks the download reference button and returns the download event object. */
  | { action: 'checkout.voucher.oxxo.downloadReference'; stepName?: string }
  /** Reads the deadline date label from the OXXO voucher and returns it as an ISO string. */
  | { action: 'checkout.voucher.oxxo.getDeadlineDateIso'; stepName?: string }
  /** Clicks the payment details button in the OXXO voucher. */
  | { action: 'checkout.voucher.oxxo.goToPaymentDetails'; stepName?: string }
  /** Asserts that the download reference button is present and then becomes hidden after interaction. */
  | { action: 'checkout.voucher.pix.assertDownloadReferenceButton'; stepName?: string }
  /** Asserts that the Pix voucher title, description, QR code section, reference title, and countdown are visible. */
  | { action: 'checkout.voucher.pix.assertPixVoucher'; stepName?: string }
  /** Asserts that the Pix voucher active countdown text is visible. */
  | { action: 'checkout.voucher.pix.assertPixVoucherCountdown'; stepName?: string }
  /** Asserts that the Pix voucher expiration text is visible (waits up to 2 minutes). */
  | { action: 'checkout.voucher.pix.assertPixVoucherExpirationText'; stepName?: string }
  /** Clicks the cancel button and confirms the cancellation in the Pix voucher dialog. */
  | { action: 'checkout.voucher.pix.clickCancel'; stepName?: string }
  /** Clicks the copy reference/PIX key button in the Pix voucher. */
  | { action: 'checkout.voucher.pix.clickCopyReference'; stepName?: string }
  /** Asserts that the specified processor accordion is open/checked in the SafetyPay voucher. */
  | { action: 'checkout.voucher.safetypay.assertProcessorAccordionOpen'; stepName?: string; params: { processorId: string } }
  /** Asserts that the processor content (title, description, reference title) is visible for the given SafetyPay processor. */
  | { action: 'checkout.voucher.safetypay.assertProcessorContentVisible'; stepName?: string; params: { processorId: "oxxo_reference" | "baz_reference" | "safetypay_express" | "deuna_wallet" } }
  /** Asserts that the specified processor title is not visible in the SafetyPay voucher. */
  | { action: 'checkout.voucher.safetypay.assertProcessorTitleHidden'; stepName?: string; params: { processorId: string } }
  /** Asserts the SafetyPay iframe shows the payment confirmed redirecting message. */
  | { action: 'checkout.voucher.safetypay.assertRedirectingAfterPaymentConfirmation'; stepName?: string }
  /** Asserts that the SafetyPay redirect-to-commerce processing view is visible. */
  | { action: 'checkout.voucher.safetypay.assertRedirectToCommerceView'; stepName?: string }
  /** Asserts that the shield lock security icon is visible in the SafetyPay iframe. */
  | { action: 'checkout.voucher.safetypay.assertShieldLockIsVisible'; stepName?: string }
  /** Asserts that the success alert notification in the SafetyPay voucher frame has the expected text. */
  | { action: 'checkout.voucher.safetypay.assertSuccessAlertNotification'; stepName?: string; params: { text: string } }
  /** Asserts that the specified processor titles are visible in the SafetyPay voucher frame. */
  | { action: 'checkout.voucher.safetypay.assertTitleProcessors'; stepName?: string; params?: { processorIds?: string[] } }
  /** Asserts that all voucher sections (header, body, due date, footer) are hidden. */
  | { action: 'checkout.voucher.safetypay.assertVoucherHidden'; stepName?: string }
  /** Clicks the cancel button in the SafetyPay voucher frame. */
  | { action: 'checkout.voucher.safetypay.clickCancelButton'; stepName?: string }
  /** Clicks the pay button in the SafetyPay iframe, accepting terms and conditions if present first. */
  | { action: 'checkout.voucher.safetypay.clickPayInSafetyPay'; stepName?: string }
  /** Closes the SafetyPay bank login popup window. */
  | { action: 'checkout.voucher.safetypay.closeBankLoginPopup'; stepName?: string }
  /** Closes the SafetyPay sandbox demo bank page tab. */
  | { action: 'checkout.voucher.safetypay.closeSandboxDemoBankPage'; stepName?: string }
  /** Confirms the transaction on the SafetyPay sandbox demo bank and asserts the operation was successful. */
  | { action: 'checkout.voucher.safetypay.confirmTransaction'; stepName?: string }
  /** Extracts the transaction code and total amount from the SafetyPay iframe for use in the sandbox bank. */
  | { action: 'checkout.voucher.safetypay.extractDataToCompleteTransaction'; stepName?: string }
  /** Fills the credentials and logs in to the SafetyPay sandbox demo bank. */
  | { action: 'checkout.voucher.safetypay.loginSandboxDemoBankCredentials'; stepName?: string }
  /** Opens the SafetyPay processor accordion by clicking its title in the voucher frame. */
  | { action: 'checkout.voucher.safetypay.openProcessorAccordion'; stepName?: string; params: { processorId: string } }
  /** Opens the SafetyPay sandbox demo bank page in a new tab. */
  | { action: 'checkout.voucher.safetypay.openSandboxDemoBankPage'; stepName?: string; params: { context: BrowserContext } }
  /** Waits for the external SafetyPay bank login popup to open. */
  | { action: 'checkout.voucher.safetypay.waitForExternalSafetyPayBankView'; stepName?: string }
  /** Waits for the SafetyPay embedded iframe to become visible within the voucher frame. */
  | { action: 'checkout.voucher.safetypay.waitForSafetyPayIframe'; stepName?: string }
  /** Asserts that the Apple Pay wallet button container has been mounted inside the Payment Widget iframe. */
  | { action: 'checkout.wallet.applePay.assertWalletButtonVisible'; stepName?: string }
  /** Clicks the Pay button on the Formularios page to open the Payment Widget restricted to the apple_pay processor. */
  | { action: 'checkout.wallet.applePay.clickPay'; stepName?: string }
  /** Clicks the Apple Pay button mounted inside the Payment Widget iframe. Triggers requestApplePayment against the mocked ApplePaySession. */
  | { action: 'checkout.wallet.applePay.clickWalletButton'; stepName?: string }
  /** Installs window-level + network mocks for Apple Pay so the Payment Widget can mount the wallet button without real ApplePaySession or merchant validation. Must be called before checkout.openCheckout. */
  | { action: 'checkout.wallet.applePay.installMocks'; stepName?: string }
  /** Clicks the Apple Pay form option on the Formularios experience to choose apple_pay as the single processor for the Payment Widget. */
  | { action: 'checkout.wallet.applePay.selectForm'; stepName?: string }
  /** Invokes the Apple Pay mock authorize() helper so the session synchronously fires onvalidatemerchant and onpaymentauthorized with a successful payment payload. */
  | { action: 'checkout.wallet.applePay.triggerSuccessAuthorization'; stepName?: string }
  /** Asserts that the Bizum voucher title, description, reference title, and countdown are visible. */
  | { action: 'checkout.wallet.bizum.assertBizumVoucher'; stepName?: string }
  /** Asserts that the Bizum voucher active countdown text is visible. */
  | { action: 'checkout.wallet.bizum.assertBizumVoucherCountdown'; stepName?: string }
  /** Asserts that the Bizum voucher expiration text is visible (waits up to 2 minutes). */
  | { action: 'checkout.wallet.bizum.assertBizumVoucherExpirationText'; stepName?: string }
  /** Asserts that the download reference button is present and then becomes hidden after interaction. */
  | { action: 'checkout.wallet.bizum.assertDownloadReferenceButton'; stepName?: string }
  /** Asserts that the validation error message is visible for the phone input in Haruka. */
  | { action: 'checkout.wallet.bizum.assertPhoneError'; stepName?: string }
  /** Asserts that the purchase response was successful and status is pending. */
  | { action: 'checkout.wallet.bizum.assertPurchasePendingResponse'; stepName?: string }
  /** Clicks the cancel button and confirms the cancellation in the Bizum voucher dialog. */
  | { action: 'checkout.wallet.bizum.clickCancel'; stepName?: string }
  /** Clicks the copy reference button in the Bizum voucher. */
  | { action: 'checkout.wallet.bizum.clickCopyReference'; stepName?: string }
  /** Clicks the Pay button on the Bizum form to trigger the purchase. */
  | { action: 'checkout.wallet.bizum.clickPay'; stepName?: string }
  /** Clicks the Pay button and waits for the purchase response to complete. */
  | { action: 'checkout.wallet.bizum.clickPayAndCapturePurchaseResponse'; stepName?: string }
  /** Fills the phone number input in the Bizum push form and verifies the value. */
  | { action: 'checkout.wallet.bizum.fillPhoneNumber'; stepName?: string; params?: { phone?: string } }
  /** Clicks the Bizum payment method tab in the checkout form. */
  | { action: 'checkout.wallet.bizum.selectBizumTab'; stepName?: string }
  /** Captures a visual snapshot of the Bizum phone input form across the specified viewport set. */
  | { action: 'checkout.wallet.bizum.verifyFormVisualConsistency'; stepName?: string; params: { snapshotName: string; viewports?: "all" | "desktopOnly" | "phoneOnly" | "tabletOnly" | "desktopAndFullscreen" | "mobileAndTablet" } }
  /** Captures a visual snapshot of the Bizum voucher / reference page with dynamic masks applied. */
  | { action: 'checkout.wallet.bizum.verifyVoucherVisualConsistency'; stepName?: string; params: { snapshotName: string; viewports?: "all" | "desktopOnly" | "phoneOnly" | "tabletOnly" | "desktopAndFullscreen" | "mobileAndTablet" } }
  /** Waits until the Bizum phone number input is visible, indicating the page has loaded. */
  | { action: 'checkout.wallet.bizum.waitUntilLoadPage'; stepName?: string }
  /** Accepts the cookie policy modal if present, applicable for country BR. */
  | { action: 'checkout.wallet.click2pay.acceptCookiePolicyIfPresent'; stepName?: string; params: { country: string } }
  /** Asserts that the available cards list (Visa/Mastercard/Amex) container is visible in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.assertAvailableCards'; stepName?: string }
  /** Asserts that the billing section title is visible in the Click2Pay form. */
  | { action: 'checkout.wallet.click2pay.assertBillingHeadings'; stepName?: string }
  /** Asserts all card form validation error messages are visible (card number, expiration date, CVV, cardholder). */
  | { action: 'checkout.wallet.click2pay.assertCardFormErrorMessages'; stepName?: string }
  /** Asserts that the cardholder validation error message is visible on the card form. */
  | { action: 'checkout.wallet.click2pay.assertCardHolderError'; stepName?: string }
  /** Asserts that the Click2Pay agreement/disclaimer section is visible. */
  | { action: 'checkout.wallet.click2pay.assertClickToPayAgreementSection'; stepName?: string }
  /** Asserts that the Click2Pay OTP authentication form container is visible. */
  | { action: 'checkout.wallet.click2pay.assertClickToPayAuthFormVisible'; stepName?: string }
  /** Asserts that the collect email screen headings (account access, email label, disclaimer) are visible. */
  | { action: 'checkout.wallet.click2pay.assertCollectEmailHeadings'; stepName?: string }
  /** Asserts the payload sent when creating a card in Click2Pay contains all required credential_source_config fields. */
  | { action: 'checkout.wallet.click2pay.assertCreateCardPayload'; stepName?: string; params: { response: Response } }
  /** Asserts the response from creating a card in Click2Pay has status 201 and contains all required card data fields. */
  | { action: 'checkout.wallet.click2pay.assertCreateCardResponse'; stepName?: string; params: { response: Response } }
  /** Asserts that the CVV required error message is visible in the Click2Pay flow. */
  | { action: 'checkout.wallet.click2pay.assertCvvRequiredMessage'; stepName?: string }
  /** Asserts that the Mastercard UCS iframe displays the correct locale/country text. */
  | { action: 'checkout.wallet.click2pay.assertMastercardHasProperLocaleText'; stepName?: string; params: { locale: string } }
  /** Asserts that the payment section headings (title, card fields) are visible. */
  | { action: 'checkout.wallet.click2pay.assertPaymentsHeadings'; stepName?: string }
  /** Asserts that the processing your order page is visible during the Click2Pay flow. */
  | { action: 'checkout.wallet.click2pay.assertProcessingPage'; stepName?: string }
  /** Asserts that the user data section headings (title, first name, last name) are visible. */
  | { action: 'checkout.wallet.click2pay.assertUserDataHeadings'; stepName?: string }
  /** Asserts that the user billing and shipping address data (name, last name) is correctly sent in the purchase request. */
  | { action: 'checkout.wallet.click2pay.assertUserDataSentInPurchaseRequest'; stepName?: string; params: { name: string; last_name: string } }
  /** Asserts that the OTP user page title is visible in the Click2Pay flow. */
  | { action: 'checkout.wallet.click2pay.assertUserOtpTitle'; stepName?: string }
  /** Asserts that the Mastercard Sonic SDK is called, confirming the Sonic brand experience is shown. */
  | { action: 'checkout.wallet.click2pay.assertUserSeesMastercardSonicBrand'; stepName?: string }
  /** Clears the cardholder name input in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.clearCardHolder'; stepName?: string }
  /** Clicks the accept terms and conditions checkbox in the Click2Pay form. */
  | { action: 'checkout.wallet.click2pay.clickAcceptTermsAndConditions'; stepName?: string }
  /** Clicks the back/exit button in the Click2Pay form to go back. */
  | { action: 'checkout.wallet.click2pay.clickBack'; stepName?: string }
  /** Clicks the back button inside the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.clickBackButton'; stepName?: string }
  /** Clicks the main continue button in the Click2Pay form. */
  | { action: 'checkout.wallet.click2pay.clickContinue'; stepName?: string }
  /** Clicks continue and confirms the guest flow in the Mastercard user info iframe. */
  | { action: 'checkout.wallet.click2pay.clickContinueAndConfirmsGuestFlow'; stepName?: string }
  /** Clicks the continue-as-guest button in the Mastercard user info iframe. */
  | { action: 'checkout.wallet.click2pay.clickContinueAsGuest'; stepName?: string }
  /** Clicks the continue button to proceed to the Click2Pay authentication flow. */
  | { action: 'checkout.wallet.click2pay.clickContinueToAuthFlow'; stepName?: string }
  /** Clicks the continue button to proceed into the Click2Pay payment flow. */
  | { action: 'checkout.wallet.click2pay.clickContinueToClick2PayFlow'; stepName?: string }
  /** Clicks the enter-as-guest radio button in the Mastercard user info iframe. */
  | { action: 'checkout.wallet.click2pay.clickEnterAsGuest'; stepName?: string }
  /** Clicks the send OTP button for the specified channel (email or sms) in the Click2Pay authentication flow. */
  | { action: 'checkout.wallet.click2pay.clickSendOtp'; stepName?: string; params: { otpType: "email" | "sms" } }
  /** Fills the cardholder name input in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.fillCardHolder'; stepName?: string; params: { cardHolder: string } }
  /** Fills all card fields (number, expiration date, CVV, cardholder name) in the Click2Pay form. */
  | { action: 'checkout.wallet.click2pay.fillCardInfo'; stepName?: string; params: { creditCardInfo: BaseCreditCard } }
  /** Fills the credit card number input in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.fillCreditCardNumber'; stepName?: string; params: { creditCardNumber: string } }
  /** Fills the CVV input in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.fillCvv'; stepName?: string; params: { cvv: string } }
  /** Fills the email input in the Click2Pay collect email screen. */
  | { action: 'checkout.wallet.click2pay.fillEmail'; stepName?: string; params: { email: string } }
  /** Fills the expiration date input in the Click2Pay iframe. */
  | { action: 'checkout.wallet.click2pay.fillExpirationDate'; stepName?: string; params: { expirationDate: string } }
  /** Fills the Mastercard user info (phone number) in the Mastercard UCS iframe. */
  | { action: 'checkout.wallet.click2pay.fillMastercardUserInfo'; stepName?: string }
  /** Fills the OTP verification code in the Click2Pay authentication window. */
  | { action: 'checkout.wallet.click2pay.fillOtp'; stepName?: string; params: { otp: string } }
  /** Fills user info in the Mastercard iframe, handling the guest flow automatically if it appears. */
  | { action: 'checkout.wallet.click2pay.fillUserInfo'; stepName?: string }
  /** Clicks the terms and conditions link and verifies it opens a page containing the expected URL. */
  | { action: 'checkout.wallet.click2pay.opensTermsConditionsPage'; stepName?: string; params: { urlLink: string } }
  /** Saves the Mastercard user info by clicking the continue button. */
  | { action: 'checkout.wallet.click2pay.saveMastercardUserInfo'; stepName?: string }
  /** Asserts that the missing terms and conditions alert is visible after attempting to continue without accepting. */
  | { action: 'checkout.wallet.click2pay.showAlertForMissingTermsAndConditions'; stepName?: string }
  /** Asserts that the missing email error message is visible after attempting to continue without an email. */
  | { action: 'checkout.wallet.click2pay.showErrorMessageForMissingEmail'; stepName?: string }
  /** Sets up an interceptor to wait for the purchase response from the Click2Pay transaction. */
  | { action: 'checkout.wallet.click2pay.waitForPurchaseResponse'; stepName?: string }
  /** Waits for the Mastercard Sonic SDK script to be requested, returning true if called within the timeout. */
  | { action: 'checkout.wallet.click2pay.WaitForSonicSdkCalled'; stepName?: string }
  /** Waits for the identities validation request to be fired during the Click2Pay flow. */
  | { action: 'checkout.wallet.click2pay.waitForValidationRequest'; stepName?: string }
  /** Waits for the POST /cards response from the DEUNA API, used to verify card saving. */
  | { action: 'checkout.wallet.click2pay.waitResponseFromSaveCard'; stepName?: string }
  /** Returns whether the Click2Pay payment container widget is hidden. */
  | { action: 'checkout.wallet.click2pay.widgetIsNotVisible'; stepName?: string }
  /** Returns whether the Click2Pay payment container widget is visible. */
  | { action: 'checkout.wallet.click2pay.widgetIsVisible'; stepName?: string }
  /** Asserts that the document number input is hidden in the Daviplata form. */
  | { action: 'checkout.wallet.daviplata.assertDocumentNumberHidden'; stepName?: string }
  /** Asserts that the document number input is visible in the Daviplata form. */
  | { action: 'checkout.wallet.daviplata.assertDocumentNumberVisible'; stepName?: string }
  /** Asserts that the OTP code sent confirmation label is visible in the Daviplata form. */
  | { action: 'checkout.wallet.daviplata.assertOtpCodeSentVisible'; stepName?: string }
  /** Enters the OTP code into the Daviplata OTP input field. */
  | { action: 'checkout.wallet.daviplata.enterOtpCode'; stepName?: string; params?: { codeOTP?: string } }
  /** Fills the document number input in the Daviplata form and verifies the value. */
  | { action: 'checkout.wallet.daviplata.fillDocumentNumber'; stepName?: string; params?: { number?: string } }
  /** Clicks the resend OTP code button and waits for the purchase response. */
  | { action: 'checkout.wallet.daviplata.resendOtpCode'; stepName?: string }
  /** Asserts that the Google Pay wallet button container has been mounted inside the Payment Widget iframe. */
  | { action: 'checkout.wallet.googlePay.assertWalletButtonVisible'; stepName?: string }
  /** Clicks the Pay button on the Formularios page to open the Payment Widget restricted to the google_pay processor. */
  | { action: 'checkout.wallet.googlePay.clickPay'; stepName?: string }
  /** Clicks the Google Pay button mounted inside the Payment Widget iframe. Triggers requestGooglePayment which resolves loadPaymentData against the mocked PaymentsClient. */
  | { action: 'checkout.wallet.googlePay.clickWalletButton'; stepName?: string }
  /** Installs window-level + network mocks for Google Pay so the Payment Widget can mount the wallet button without loading the real pay.google.com SDK. Must be called before checkout.openCheckout. */
  | { action: 'checkout.wallet.googlePay.installMocks'; stepName?: string }
  /** Clicks the Google Pay form option on the Formularios experience to choose google_pay as the single processor for the Payment Widget. */
  | { action: 'checkout.wallet.googlePay.selectForm'; stepName?: string }
  /** Asserts that the MercadoPago warning alert notification has the expected text. */
  | { action: 'checkout.wallet.mercadoPago.assertAlertNotification'; stepName?: string; params: { text: string } }
  /** Asserts that the BBVA payment instruction is visible on the MercadoPago thank-you page. */
  | { action: 'checkout.wallet.mercadoPago.assertBBVAInstructionVisible'; stepName?: string }
  /** Asserts that the how-to-pay title in the MercadoPago payment methods screen is visible. */
  | { action: 'checkout.wallet.mercadoPago.assertHowToPayViewVisible'; stepName?: string }
  /** Asserts that the card form is visible in MercadoPago by checking the card number input. */
  | { action: 'checkout.wallet.mercadoPago.assertLabelCardFormVisible'; stepName?: string }
  /** Asserts that the processing payment label is visible in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.assertLabelProcessingPaymentVisible'; stepName?: string }
  /** Asserts that the redirecting-to-site label is visible in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.assertLabelRedirectingToSiteVisible'; stepName?: string }
  /** Asserts that the MercadoPago wallet landing page with account/without-account buttons is visible. */
  | { action: 'checkout.wallet.mercadoPago.assertMercadoPagoWalletVisible'; stepName?: string }
  /** Asserts that the payment failed/rejected icon is visible in MercadoPago, handling MP internal errors with evidence capture. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentFailed'; stepName?: string; params?: { testInfo?: unknown } }
  /** Asserts payment rejection or captures evidence if MercadoPago shows an internal error page. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentFailedOrMPError'; stepName?: string; params?: { timeout?: number; testInfo?: unknown } }
  /** Asserts that the finalize payment label is visible on the MercadoPago result page. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentFinalize'; stepName?: string }
  /** Asserts that the payment method review labels are visible in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentMethodViewVisible'; stepName?: string }
  /** Asserts that the payment processing label is visible on the MercadoPago thank-you page. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentProcessing'; stepName?: string }
  /** Asserts that the payment successful label is visible on the MercadoPago thank-you page. */
  | { action: 'checkout.wallet.mercadoPago.assertPaymentSuccessful'; stepName?: string }
  /** Clicks the account balance payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickAccountBalance'; stepName?: string }
  /** Clicks the back-to-site button in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickBackToSite'; stepName?: string }
  /** Clicks the bank transfer payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickBankTransfer'; stepName?: string }
  /** Clicks the BBVA payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickBBVA'; stepName?: string }
  /** Clicks the Buy Now Pay Later (BNPL) payment method option in MercadoPago, handling the choose-another-method button if visible. */
  | { action: 'checkout.wallet.mercadoPago.clickBNPL'; stepName?: string }
  /** Clicks the acknowledge button on the MercadoPago payment result screen. */
  | { action: 'checkout.wallet.mercadoPago.clickButtonAcknowledge'; stepName?: string }
  /** Clicks the change payment method button in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickChangePaymentMethod'; stepName?: string }
  /** Clicks the choose another payment method button in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickChooseAnotherPaymentMethod'; stepName?: string }
  /** Clicks the continue button in the MercadoPago flow. */
  | { action: 'checkout.wallet.mercadoPago.clickContinueButton'; stepName?: string }
  /** Clicks the credit card payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickCreditCard'; stepName?: string }
  /** Clicks the debit card payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickDebitCard'; stepName?: string }
  /** Clicks the Efecty payment method option in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickEfecty'; stepName?: string }
  /** Clicks the installments dropdown trigger in MercadoPago. */
  | { action: 'checkout.wallet.mercadoPago.clickInstallments'; stepName?: string }
  /** Clicks the login/submit button on the MercadoPago login page. */
  | { action: 'checkout.wallet.mercadoPago.clickLoginButton'; stepName?: string }
  /** Clicks the login with account button to enter the MercadoPago authenticated flow. */
  | { action: 'checkout.wallet.mercadoPago.clickLoginWithAccount'; stepName?: string }
  /** Clicks the 1x installment option in the MercadoPago installments selector. */
  | { action: 'checkout.wallet.mercadoPago.clickOneInstallmentOption'; stepName?: string }
  /** Clicks the 3 installments option in the MercadoPago installments dropdown. */
  | { action: 'checkout.wallet.mercadoPago.clickOption3Installments'; stepName?: string }
  /** Clicks the pay button in the MercadoPago payment review screen. */
  | { action: 'checkout.wallet.mercadoPago.clickPay'; stepName?: string }
  /** Clicks the submit button in the MercadoPago verification code screen. */
  | { action: 'checkout.wallet.mercadoPago.clickSubmitButton'; stepName?: string }
  /** Enters the verification code character by character into the MercadoPago code inputs. */
  | { action: 'checkout.wallet.mercadoPago.enterCode'; stepName?: string; params: { code: string } }
  /** Fills the email input on the MercadoPago login page. */
  | { action: 'checkout.wallet.mercadoPago.enterEmail'; stepName?: string; params: { email: string } }
  /** Fills the password input on the MercadoPago login page. */
  | { action: 'checkout.wallet.mercadoPago.enterPassword'; stepName?: string; params: { password: string } }
  /** Fills all card fields (number, holder, expiration, CVV) in the MercadoPago card form. */
  | { action: 'checkout.wallet.mercadoPago.fillCard'; stepName?: string; params: { cardDetails: MercadoPagoWalletCardDetails } }
  /** Extracts the 6-digit verification code embedded before the @ in an email address. */
  | { action: 'checkout.wallet.mercadoPago.getVerificationCodeFromEmail'; stepName?: string; params: { email: string } }
  /** Handles the post-payment flow in MercadoPago, detecting CAPTCHA, MP internal errors, or successful payment rejection. */
  | { action: 'checkout.wallet.mercadoPago.handlePostPaymentFlow'; stepName?: string }
  /** Detects if MercadoPago is showing a CAPTCHA challenge, returning true if any CAPTCHA element is visible. */
  | { action: 'checkout.wallet.mercadoPago.hasCaptcha'; stepName?: string; params?: { timeout?: number } }
  /** Returns whether the enter-code container is visible in MercadoPago within the given timeout. */
  | { action: 'checkout.wallet.mercadoPago.isContainerEnterCodeVisible'; stepName?: string; params?: { timeout?: number } }
  /** Logs in to MercadoPago by submitting email (with retry) and then password. */
  | { action: 'checkout.wallet.mercadoPago.login'; stepName?: string; params: { credentials: { email: string; password: string } } }
  /** Waits for the MercadoPago processing payment screen to disappear before continuing. */
  | { action: 'checkout.wallet.mercadoPago.waitForProcessingToComplete'; stepName?: string; params?: { timeout?: number } }
  /** Asserts that the DEUNA powered-by logo is visible on the Nequi page. */
  | { action: 'checkout.wallet.nequi.assertDEUNALogoVisible'; stepName?: string }
  /** Asserts that the captured Nequi push verify response has order status succeeded. */
  | { action: 'checkout.wallet.nequi.assertNequiPushVerifyOrderStatus'; stepName?: string }
  /** Asserts that the phone number input is visible in the Nequi push form. */
  | { action: 'checkout.wallet.nequi.assertPhoneNumberVisible'; stepName?: string }
  /** Asserts that the phone verification confirmation text is visible in the Nequi push flow. */
  | { action: 'checkout.wallet.nequi.assertPhoneVerificationPageVisible'; stepName?: string }
  /** Fills the phone number input in the Nequi push form and verifies the value. */
  | { action: 'checkout.wallet.nequi.fillPhoneNumber'; stepName?: string; params?: { phone?: string } }
  /** Intercepts the Nequi push verify endpoint and returns a mocked response with the given status and body. */
  | { action: 'checkout.wallet.nequi.interceptVerifyResponse'; stepName?: string; params: { interceptorRequest: InterceptorRequest; times?: number } }
  /** Intercepts the Nequi verify endpoint to simulate a webhook flow: first call returns pending, subsequent calls return success. */
  | { action: 'checkout.wallet.nequi.interceptVerifyWebhookFlow'; stepName?: string; params: { pendingBody: unknown; successBody: unknown } }
  /** Sets up an interceptor to capture the next Nequi push verify response. */
  | { action: 'checkout.wallet.nequi.waitForNequiPushVerifyResponse'; stepName?: string }
  /** Sets up an interceptor that waits for a Nequi push verify response with order status succeeded. */
  | { action: 'checkout.wallet.nequi.waitForNequiPushVerifySucceededResponse'; stepName?: string }
  /** Waits until the Nequi phone number input is visible, indicating the page has loaded. */
  | { action: 'checkout.wallet.nequi.waitUntilLoadPage'; stepName?: string }
  /** Asserts that the current URL corresponds to the PayPal sandbox checkout experience page. */
  | { action: 'checkout.wallet.paypal.assertPayPalCheckoutExperiencePage'; stepName?: string }
  /** Asserts that the current URL corresponds to the PayPal sandbox vaulting/agreements experience page. */
  | { action: 'checkout.wallet.paypal.assertPayPalVaultingExperiencePage'; stepName?: string }
  /** Asserts that the redirect page main text matches the expected string. */
  | { action: 'checkout.wallet.paypal.assertRedirectPage'; stepName?: string; params: { text: string } }
  /** Clicks the PayPal consent button to authorize the payment. */
  | { action: 'checkout.wallet.paypal.clickConsentButton'; stepName?: string }
  /** Clicks the PayPal payment submit button to initiate the payment. */
  | { action: 'checkout.wallet.paypal.clickPaymentButton'; stepName?: string }
  /** Clicks the return-to-store/cancel button on the PayPal page. */
  | { action: 'checkout.wallet.paypal.clickReturnToStoreButton'; stepName?: string }
  /** Closes the current PayPal page (used for popup flows). */
  | { action: 'checkout.wallet.paypal.closePage'; stepName?: string }
  /** Fills the email input on the PayPal login page. */
  | { action: 'checkout.wallet.paypal.insertEmail'; stepName?: string; params: { email: string } }
  /** Fills the OTP code field and submits it during the PayPal login verification step. */
  | { action: 'checkout.wallet.paypal.insertOtp'; stepName?: string; params?: { otpCode?: string } }
  /** Fills the password input on the PayPal login page. */
  | { action: 'checkout.wallet.paypal.insertPassword'; stepName?: string; params: { password: string } }
  /** Logs in to PayPal for a checkout flow by entering email, password, and clicking the login button. */
  | { action: 'checkout.wallet.paypal.loginCheckout'; stepName?: string; params: { email: string; password: string } }
  /** Logs in to PayPal for a vaulting flow by entering email, clicking continue, then entering password. */
  | { action: 'checkout.wallet.paypal.loginVaulting'; stepName?: string; params: { email: string; password: string } }
  /** Selects the 1x installment option in the PayPal checkout installments selector. */
  | { action: 'checkout.wallet.paypal.selectCheckoutInstallments'; stepName?: string }
  /** Asserts that the PayPal SPB button is visible on the checkout page. */
  | { action: 'checkout.wallet.venmo.assertPaypalSpbButton'; stepName?: string }
  /** Selects Venmo as payment method and clicks the pay button on the checkout form. */
  | { action: 'checkout.wallet.venmo.selectVenmoForm'; stepName?: string }
  /** Verifies the visual consistency of the Venmo disclaimer iframe. */
  | { action: 'checkout.wallet.venmo.verifyDisclaimerVisualConsistency'; stepName?: string; params: { snapshotName: string } }
  /** Asserts that the Payment Vault processor title is visible. */
  | { action: 'checkout.websdk.assertPaymentVaultProcessorTitle'; stepName?: string }
  /** Asserts that the Payment Widget processor title is visible. */
  | { action: 'checkout.websdk.assertPaymentWidgetProcessorTitle'; stepName?: string }
  /** Navigates to the WebSDK harness test application, optionally with a specific version. */
  | { action: 'checkout.websdk.goToHarness'; stepName?: string; params?: { version?: string } }
  /** Initializes the WebSDK client with the provided merchant public API key. */
  | { action: 'checkout.websdk.init'; stepName?: string; params: { publicApiKey: string } }
  /** Navigates directly to a checkout URL (e.g. a payment link URL from the order response), bypassing the harness app. Use this to test session persistence when the checkout is opened via a redirect instead of the WebSDK harness. */
  | { action: 'checkout.websdk.openCheckoutUrl'; stepName?: string; params: { url: string } }
  /** Opens the WebSDK Elements widget with the given configuration (orderToken, userToken, behavior, etc.). */
  | { action: 'checkout.websdk.openElements'; stepName?: string; params?: WebSDKWidgetConfig }
  /** Opens the WebSDK Payment Widget with the given configuration (orderToken, language, etc.). */
  | { action: 'checkout.websdk.openPaymentWidget'; stepName?: string; params?: WebSDKWidgetConfig }
  /** Pauses the test for the given number of milliseconds. Use only when waiting for backend state that has no observable UI change (e.g. OTP code expiration windows). */
  | { action: 'core.timing.wait'; stepName?: string; params: WaitParams }
  /** Clicks the embedded pay button to confirm the selected payment method and open the embedded widget. */
  | { action: 'payment.page.clickOnPayButtonEmbedded'; stepName?: string }
  /** Clicks the summary pay button without waiting for the purchase transaction response. */
  | { action: 'payment.page.clickOnPayButtonSummaryWithOutTransaction'; stepName?: string }
  /** Selects a payment method in the payment selection screen by its visible text (e.g. "Payment Vault (Web SDK)", "Tarjeta de crédito"). */
  | { action: 'payment.page.selectPaymentMethod'; stepName?: string; params: SelectPaymentMethodParams }
  /** Creates an MCI (meses con intereses) installment campaign for the merchant in the given currency. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.campaign.createMCI'; stepName?: string; params: CampaignParams }
  /** Creates an MSI (meses sin intereses) installment campaign for the merchant in the given currency. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.campaign.createMSI'; stepName?: string; params: CampaignParams }
  /** Deletes an installment campaign; omit campaignId to delete the merchant's campaigns. Intended for the cleanup list so a test does not leave campaigns behind. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.campaign.delete'; stepName?: string; params?: { campaignId?: string; merchantId?: string; merchantToken?: string } }
  /** Creates a V2 checkout configuration for the merchant (widget general config and/or elements config), e.g. to set user_experience.render_3ds_strategy or show_saved_cards_flow. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.checkout.configureV2'; stepName?: string; params?: { widgetGeneralsConfig?: unknown; elementsConfig?: unknown; orderConfig?: unknown; merchantId?: string; merchantToken?: string } }
  /** Configures the Vault widget for the merchant (checkout config, network and elements config) so the widget renders the saved-cards and authentication experience the test expects. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.checkout.configureVaultWidget'; stepName?: string; params?: { config?: ConfigurationV2; merchantId?: string; merchantToken?: string } }
  /** Enables dynamic routing, provisions the given fraud engine with manual review turned on, and makes the default rule send every risk level to the given payment processor. This is what puts a transaction "in review" instead of resolving it to an immediate approve or decline. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.fraud.configureManualReviewEngine'; stepName?: string; params: ConfigureManualReviewEngineParams }
  /** Gets a merchant from the shared merchant pool instead of creating one: the catalog entry (MERCHANT_POOL in */
  | { action: 'setup.merchant.acquirePooled'; stepName?: string; params: { key: "MX_STRIPE" | "KUSHKI_PROCESSOR_MX" | "KUSHKI_PROCESSOR_AUTHORIZE_MX" | "CIELO_AUTHORIZE_BR" | "PAYPAL_WALLET_CHECKOUT_MX" | "PAYPAL_WALLET_INSTALLMENTS_CHECKOUT_MX" | "PAY_U_PROCESSOR_AUTHORIZE_MX" | "REDE_AUTHORIZE_BR" | "STRIPE_PROCESSOR_AUTHORIZE_MX" | "OPEN_PAY_PROCESSOR_AUTHORIZE_MX" | "KUSHKI_PROCESSOR_AUTHORIZE_CL" | "NUVEI_PROCESSOR_AUTHORIZE_MX" | "TRANSBANK_PROCESSOR_AUTHORIZE_CL" | "TRANSBANK_PROCESSOR_MALL_AUTHORIZE_CL" | "GETNET_PROCESSOR_AUTHORIZE_BR" | "KUSHKI_PROCESSOR_AUTHORIZE_PE" | "KUSHKI_PROCESSOR_AUTHORIZE_CO" | "KUSHKI_PROCESSOR_PE" | "KUSHKI_PROCESSOR_CO" | "CYBERSOURCE_PROCESSOR_AUTHORIZE_PE" | "KUSHKI_PROCESSOR_CL" | "OPEN_PAY_PROCESSOR_MX" | "CASH_PROCESSOR_CHECKOUT_MX" | "BAZ_PROCESSOR_AUTHORIZE_MX" | "CYBERSOURCE_PROCESSOR_PE_DEUNA3_DS_PE" | "PAYMENTEZ_PROCESSOR_EC" | "WORLDPAY_PROCESSOR_PAYCONNECT_AUTHORIZE_MX" | "CIELO_PROCESSOR_BR" | "DLOCAL_PROCESSOR_CL" | "NUVEI_PROCESSOR_MX" | "PAYMENTEZ_EC_PROCESSOR_EC" | "REDE_PROCESSOR_BR" | "UNLIMIT_PROCESSOR_MX" | "CYBERSOURCE_PROCESSOR_AUTHORIZE_BR" | "CYBERSOURCE_PROCESSOR_PE" | "GETNET_PROCESSOR_BR" | "KUSHKI_PROCESSOR_WITH_DEUNA_THREE_DS_MX" | "KUSHKI_PROCESSOR_EC" | "PLACE_TO_PAY_PROCESSOR_CO" | "REDSYS_PROCESSOR_WITH3_DS_ES" | "UNLIMIT_PROCESSOR_PAYCONNECT_MX" | "DLOCAL_PROCESSOR_MX" | "BAMBOO_AUTHORIZE_PROCESSOR_UY" | "CYBERSOURCE_PROCESSOR_BR" | "PAGBANK_AUTHORIZE_PROCESSOR_BR" | "PAY_U_PROCESSOR_MX" | "REDSYS_PROCESSOR_ES" | "UNLIMIT_AUTHORIZE_PROCESSOR_PAYCONNECT_MX" | "WOMPI_PROCESSOR_AUTHORIZE_CO" | "WORLDPAY_PROCESSOR_BR" | "WORLDPAY_PROCESSOR_GT" | "WORLDPAY_PROCESSOR_PE" | "PAYU_PSE_PROCESSOR_CO" | "ADYEN_PROCESSOR_AUTHORIZE_MX" | "BAMBOO_AUTHORIZE_PROCESSOR_PE" | "BAMBOO_PROCESSOR_PE" | "BAZ_PROCESSOR_MX" | "CASH_PROCESSOR_EC" | "GLOBALPAY_PROCESSOR_CO" | "NIUBIZ_PROCESSOR_AUTHORIZE_PE" | "PAY_U_COLOMBIA_PROCESSOR_CO" | "POWERTRANZ_PROCESSOR3DS_HN" | "POWERTRANZ_PROCESSOR_AUTHORIZE_HN" | "TRANSBANK_PROCESSOR_CL" | "TRANSBANK_PROCESSOR_MALL_PURCHASE_CL" | "UNLIMIT_AUTHORIZE_PROCESSOR_MX" | "WORLDPAY_PROCESSOR_PAYCONNECT_MX" | "AMEX_PROCESSOR_CHECKOUT_MX" | "NO_PROCESSOR_MX" | "PAYU_EFECTY_PROCESSOR_CHECKOUT_CO" | "PAYU_PSE_PROCESSOR_CHECKOUT_CO" | "KUESKI_PROCESSOR_CHECKOUT_MX" | "NUPAY_PROCESSOR_NETWORK_BR" | "CYBERSOURCE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE" | "CYBERSOURCE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_BR" | "CYBERSOURCE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_PE" | "CYBERSOURCE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_BR" | "DLOCAL_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE" | "STRIPE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_MX" | "STRIPE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_MX" | "WORLDPAY_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_BR" | "KUSHKI_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_MX" } }
  /** Creates and configures a basic merchant for the given country using ConfigMerchant.basicSetup. Stores the merchant in the test context so later actions resolve merchantId, privateKey and publicKey without any parameter. Returns the merchant — add saveAs to reference it from a later step. */
  | { action: 'setup.merchant.basicSetup'; stepName?: string; params: { country: "CO" | "MX" | "BR" | "CL" | "EC" | "GT" | "CR" | "US" | "HN" | "PE" | "AR" | "UY" | "ES" } }
  /** Creates and configures a basic merchant with checkout support for the given country using ConfigMerchantCheckout.basicSetup. Stores the merchant in the test context so later actions resolve merchantId, privateKey and publicKey without any parameter. Returns the merchant — add saveAs to reference it from a later step. */
  | { action: 'setup.merchant.configureCheckout'; stepName?: string; params: { country: "CO" | "MX" | "BR" | "CL" | "EC" | "GT" | "CR" | "US" | "HN" | "PE" | "AR" | "UY" | "ES" } }
  /** Applies a merchant-level payments configuration (e.g. MERCADOPAGO_BINARY_MODE = DISABLED). Pass one of the named constants in */
  | { action: 'setup.merchant.configurePayments'; stepName?: string; params: { configuration: ConfigurationMerchantPaymentsData; storeId?: string; merchantId?: string; merchantToken?: string } }
  /** Manages Statsig feature flag rules for a given flag ID. Use action="create" to add a rule, "delete" to remove it, or "get" to retrieve existing rules. */
  | { action: 'setup.merchant.configureStatsig'; stepName?: string; params: { featureFlagID: "should-finish-flow-by-payment-type" | "should-login-with-sift" | "use-multi-capture-with-lock" | "reconciliations_merchants" | "handle-cvv-required" | "enable-unknown-card-brand-response"; ruleID: "merchants-that-dont-evaluate-cash-orders" | "merchants-that-dont-evaluate-cash-orders-test" | "merchants-that-use-multi-capture-with-lock-not-complete-amount-test" | "merchants-that-use-multi-capture-with-lock-complete-amount-test" | "merchants-that-require-cvv-on-purchase-test" | "merchants-that-dont-require-cvv-on-purchase-test" | "merchants-return-unknown-cards"; paymentType?: "$cash" | "$debit_card" | "$credit_card"; action: "create" | "delete" | "get"; merchantId?: string } }
  /** Creates a network and adds the merchant to it — required by the flows that operate on a merchant network rather than a standalone merchant. merchantId and merchantToken default to the merchant from a previous setup.merchant action. Returns { networkId, networkName } — add saveAs to reference it from a later step. */
  | { action: 'setup.merchant.createNetwork'; stepName?: string; params?: { merchantId?: string; merchantToken?: string } }
  /** Asserts that a setup.order.tokenizeOrder / setup.order.createOrder response was accepted: the expected HTTP status (default 200), a non-empty data.token, and optionally a subset of the body. */
  | { action: 'setup.order.assertOrderTokenized'; stepName?: string; params: { response: ApiResponse; expectedStatus?: number; expectedBody?: Partial<TokenizeOrderResponse> } }
  /** Creates a new tokenized order for the given country using a predefined order builder. Accepts an optional orderType to select the order template (deuna_now, deuna_checkout, or payment_link; defaults to deuna_now) and optional order options such as user_email or amount. The private key defaults to the merchant created by a previous setup.merchant action. Publishes the resulting order token and id to the step store. Returns the full tokenize response — add saveAs to reference it from a later step. */
  | { action: 'setup.order.createOrder'; stepName?: string; params: { country: "CO" | "MX" | "BR" | "CL" | "EC" | "GT" | "CR" | "US" | "HN" | "PE" | "AR" | "UY" | "ES"; privateKey?: string; orderType?: "deuna_now" | "deuna_checkout" | "payment_link"; options?: CreateOrderOptions } }
  /** Returns the current order token, published by a previous setup.order action in this run. Throws with the available step-store keys if none is found. */
  | { action: 'setup.order.getOrderToken'; stepName?: string }
  /** Tokenizes an order using the EMA service. Accepts a full order data body and an optional private key (defaults to the merchant created by a previous setup.merchant action). Publishes the resulting order token and id to the step store. Returns the full tokenize response — add saveAs to reference it from a later step. */
  | { action: 'setup.order.tokenizeOrder'; stepName?: string; params: { orderData: TokenizeOrderRequestData; privateKey?: string; expectError?: boolean } }
  /** Creates a payment processor. merchantId defaults to the merchant from a previous setup.merchant action. Returns the created processor id — add saveAs to capture it, then pass ref() to setup.processor.deleteProcessor. */
  | { action: 'setup.processor.createProcessor'; stepName?: string; params: { processorConfig: BaseProcessor; merchantId?: string; merchantToken?: string } }
  /** Deletes a payment processor by its id. Expects a 204 from the payment service. Pass processorId with ref() from the step that created it; merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.processor.deleteProcessor'; stepName?: string; params: { processorId: string; merchantId?: string; merchantToken?: string } }
  /** Enables dynamic routing for the merchant and creates its default payment rule as a cascade over the given connections, in the given order: the next connection is attempted only when the previous one fails. Use it to put two affiliations of the same PSP behind one strategy. merchantId and merchantToken default to the merchant from a previous setup.merchant action. */
  | { action: 'setup.routing.createCascadeRule'; stepName?: string; params: CreateCascadeRuleParams }
  /** Asserts that a `setup.user.enrollCard` call in raw mode (with `cardData` and `expectError: true`) was rejected the way RIS-132's fix requires: HTTP 400, the `error.credit_card_validation` code, a description mentioning the invalid expiration, and no persisted card (no `data.id`) — proving the invalid `expiry_month` never reaches the database in the first place. */
  | { action: 'setup.user.assertCardCreationRejected'; stepName?: string; params: { response: ApiResponse; descriptionContains?: string } }
  /** Asserts that a setup.user.getCards response proves RIS-132 is fixed: HTTP 200 (not the 500/SQLSTATE 22007 from the incident), a readable card list, and none of the rejected card numbers from setup.user.enrollCard present in it. */
  | { action: 'setup.user.assertCardsListHealthy'; stepName?: string; params: { response: ApiResponse; rejectedCardNumbers?: string[] } }
  /** Enrolls a card on an existing registered shopper via POST `/users/{userId}/cards`. Two input modes: - Fixture mode (happy path): pass `creditCard` + `address`. The action derives the `UserCardRequestData` from them (expiry month/year split from `expiration_date`, address fields mapped straight through) so saved-card flows avoid repeating the payload shape at every call site. - Raw mode (negative tests): pass `cardData` with the exact payload to send. Use this to drive validation tests that need deliberately malformed data (e.g. `expiry_month: '/'`) — pair with `expectError: true` and a follow-up `assertCardCreationRejected` to confirm the create-time guard rejects it before it touches the database. Exactly one of the modes must be supplied; passing both or neither throws before any request leaves the client. Returns the full ApiResponse — `data.data.id` is the saved `card_id`. `userId` and `userToken` default to the shopper published by `setup.user.register`; pass them explicitly in multi-shopper flows, since the defaults follow only the last-registered shopper. */
  | { action: 'setup.user.enrollCard'; stepName?: string; params?: { creditCard?: BaseCreditCard; address?: BaseUserAddressCreditCard; cardData?: UserCardRequestData; userId?: string; userToken?: string; expectError?: boolean } }
  /** Returns the id of the shopper's saved card matching the last four digits of the given card number. Needed by actions that address a card by id, such as the subscriptions guard. */
  | { action: 'setup.user.getCardId'; stepName?: string; params: { cardNumber: string; userId?: string; userToken?: string; privateKey?: string } }
  /** Lists every saved card for the shopper via GET /users/{userId}/cards — the exact endpoint that returned HTTP 500 (SQLSTATE 22007) in RIS-132 when a card had a corrupted expiration_date. userId defaults to the shopper from setup.user.register; userToken defaults to the token from setup.user.login; privateKey defaults to the merchant from setup.merchant. Returns the raw ApiResponse for setup.user.assertCardsListHealthy. */
  | { action: 'setup.user.getCards'; stepName?: string; params?: { userId?: string; userToken?: string; privateKey?: string; expectError?: boolean } }
  /** Logs the shopper in via the SMS OTP channel and publishes the resulting user token to the step store, so a following checkout.openCheckout starts already authenticated instead of as a guest. email defaults to the shopper from setup.user.register; otp defaults to 010101. Returns the login response. */
  | { action: 'setup.user.login'; stepName?: string; params?: { email?: string; otp?: string; merchantId?: string; privateKey?: string } }
  /** Registers a shopper and sets their address, so later steps can run an authenticated or saved-card flow. Generates a unique email when none is given, and publishes it to the step store for setup.user.saveCreditCard and setup.user.login to reuse. merchantId and privateKey default to the merchant from a previous setup.merchant action. Returns the register response — add saveAs to reference it from a later step. */
  | { action: 'setup.user.register'; stepName?: string; params?: { email?: string; userData?: Partial<RegisterUserRequestData>; addressData?: Partial<AddressUserRequestData>; merchantId?: string; privateKey?: string } }
  /** Saves a credit card to a registered shopper so the widget opens on the saved-cards view. email defaults to the shopper created by a previous setup.user.register action; privateKey defaults to the merchant from setup.merchant. */
  | { action: 'setup.user.saveCreditCard'; stepName?: string; params: { creditCard: BaseCreditCard; address: BaseUserAddressCreditCard; userData: BaseUserData; email?: string; privateKey?: string } }
  /** Captures a visual snapshot of the checkout iframe (iframe.zoid-visible) across the specified viewport set and compares it against the baseline. Uses verifyIframeVisualConsistency internally. */
  | { action: 'visual.verifyCheckoutIframe'; stepName?: string; params: VerifyCheckoutIframeParams };

/** Action names as a union of string literals. */
export type ActionName = ActionStep['action'];
