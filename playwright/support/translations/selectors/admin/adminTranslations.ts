export interface AdminTranslations {
  paymentStatusSelectors: {
    failed: string;
    pending: string;
    processing: string;
    processed: string;
    denied: string;
    authorized: string;
    authorizing: string;
    pending_3ds: string;
    voided: string;
    partial_refunded: string;
    partial_refunding: string;
    refunded: string;
    refunding: string;
    captured: string;
    capturing: string;
    partial_capturing: string;
    partial_captured: string;
    cancelled: string;
  };

  paymentHistoryStatusSelectors: {
    failed: string;
    pending: string;
    processing: string;
    processed: string;
    denied: string;
    authorized: string;
    authorizing: string;
    pending_3ds: string;
    voided: string;
    partial_refunded: string;
    partial_refunding: string;
    refunded: string;
    refunding: string;
    captured: string;
    capturing: string;
    partial_capturing: string;
    partial_captured: string;
  };

  fraudStatusSelectors: {
    low: string;
    medium: string;
    high: string;
  };

  screenOrderDetails: {
    labelPaymentStatus: string;
    labelEnterAmountToCapture: string;
    labelEnterAmountToRefund: string;
    labelInstallments: string;
    labelPaymentMethod: string;
    labelDeferred: string;
    labelFraudProcesor: string;
    labelFraudIdentification: string;
    labelInstallmentAmount: string;
    labelInstallmentRate: string;
    labelExternalTransactionId: string;
    labelCopyInformation: string;
    labelAuthorizationCode: string;
    labelPaymentProcessor: string;
    labelBillingAddress: string;
    labelZipCode: string;
    labelStateName: string;
    labelReasonForRefund: string;
    labelCustomerDataTitle: string;
    labelProcessor: string;
    labelOrderStatus: string;
    linkViewMetadata: string;
    labelRefundReasonSelectOptionIncorrectOrder: string;
  };

  modalConfirmActionOrderDetails: {
    buttonConfirmCapture: string;
    buttonConfirmVoid: string;
  };

  operationsSelectors: {
    refund: string;
    capture: string;
    void: string;
    cancel: string;
    fulfill: string;
    unfulfill: string;
  };

  processorTypes: {
    all_types: string;
    payment_gateway: string;
    fraud: string;
    alternative_payment_method: string;
    traditional_payment_method: string;
    acquirer: string;
  };

  screenConfigPaymentGateway: {
    labelTitleConnections: string;
    labelTitlePaymentStrategy: string;
    labelTitleCommerce: string;
    labelTitleErrorManagement: string;
    labelTitleOrders: string;
    labelTitleMetrics: string;
    labelTitleInstallments: string;
    inputProcessorName: string;
    inputProcesorPrivateKey: string;
    inputProcesorPublicKey: string;
    inputProcessorMerchantId: string;
    inputLogin: string;
    inputTransKeys: string;
    inputSecretKey: string;
    inputAccountId: string;
    inputFlow: string;
    inputFlowVersion: string;
    input3DSVersion: string;
    inputProcessorAppKey: string;
    inputProcessorAppToken: string;
    inputProcessorClientId: string;
    inputProcessorDisplayName: string;
    inputProcessorJsonWebKey: string;
    inputProcessorAssociateMode: string;
    inputProcessorGroupId: string;
    inputProcessorStoreId: string;
    inputProcessorCostCenter: string;
    inputProcessorIntegratorCode: string;
    inputProcessorSucursal: string;
    inputProcessorBank: string;
    inputProcessorApiKey: string;
    inputDlocalSecretKey: string;
    inputProcessorTimeToExpire: string;
  };

  screenComponentsConnections: {
    inputStrategyRuleName: string;
    inputSearchConnection: string;
    inputProcessorName: string;
    inputProcessorMerchantId: string;
    inputProcessorMerchant: string;
    inputBranchId: string;
    inputUser: string;
    inputPassword: string;
    inputExternalMerchantId: string;
    inputPostalCode: string;
    inputActivityId: string;
    selectCommercialActivity: string;
    selectAdvertisement: string;
    inputCommerceName: string;
    inputCommerceStreet: string;
    inputCommerceCity: string;
    selectCommerceState: string;
    selectDurango: string;
    inputCommerceColony: string;
    inputCommerceNumberExt: string;
    inputCommerceNumberInt: string;
    labelAllowDeuna3DS: string;
    inputAcquirerMerchantId: string;
    inputMerchantName: string;
    inputMerchantCountry: string;
    inputMerchantUrl: string;
    inputMerchantCategoryCode: string;
    inputVisaAcquirerBin: string;
    inputMastercardAcquirerBin: string;
    buttonConnectProviderCredencial: string;
    buttonStrategyCreateSpecificRule: string;
    buttonStrategyGoToNextStepFirst: string;
    buttonStrategyAddCondition: string;
    buttonStrategyOptionCardType: string;
    checkboxStrategyCreditCard: string;
    buttonStrategySave: string;
    buttonStrategyCreateRouting: string;
    buttonStrategySelProcessor: string;
    optionStrategyDeclineDefault: string;
    buttonStrategyFraudProvider: string;
    buttonStrategyFraudEngine: string;
    buttonStrategySelAction: string;
    optionStrategyToProcess: string;
    buttonStrategyActivateRule: string;
    buttonConnectionsActive: string;
    buttonConnectionsDisabled: string;
    buttonConnectionsPending: string;
    buttonDisableConnection: string;
    buttonEditConnection: string;
    confirmButtonEditConnection: string;
    cancelButtonEditConnection: string;
    selectIndustry: string;
    selectTravels: string;
    checkboxATM: string;
    checkboxDigitalCurrency: string;
    checkboxBankTransfer: string;
    checkboxCreditCard: string;
    checkboxDebitCard: string;
    checkboxTicket: string;
    checkboxVoucher: string;
    checkboxCryptoCurrency: string;
    checkboxBinaryMode: string;
    inputExpirationTime: string;
    inputExpirationTimeOffline: string;
    buttonPaymentProcessor: string;
    buttonAntiFraud: string;
    buttonEdit: string;
    inputEnterName: string;
    buttonConnect: string;
    labelWalletPaymentMethods: string;
    inputCountriesSupported: string;
    inputReferencesSupported: string;
    labelTitleCredentialsMerchantIds: string;
  };

  screenDefaultProcessing: {
    labelDefaultProcessingTitle: string;
    labelStatusDefaultProcessingPre: string;
    labelStatusDefaultProcessingPost: string;
    buttonStrategyDefRuleUpdate: string;
    buttonPaymentProcessor: string;
    checkboxCvvValidation: string;
  };

  screenPaymentType: {
    buttonPaymentPurchase: string;
    buttonPaymentAuthorize: string;
  };

  screenRolesAndPermissions: {
    buttonCreateUser: string;
    labelTitleRolesAndPermissions: string;
    inputSearch: string;
    buttonViewPermissions: string;
    buttonBanUser: string;
    buttonResendInvite: string;
    buttonUpdateUser: string;
    buttonPaginatorPrevPage: string;
    buttonPaginatorNextPage: string;
    buttonConfirmModal: string;
    labelModalResendInvite: string;
    labelModalBanUser: string;
    pendingInvitationText: string;
    bannedUserText: string;
    buttonEditUser: string;
    labelAlertUpdateConfirmationPrefix: string;
    labelAlertUpdateConfirmation: string;
    labelAlertCreateConfirmation: string;
    buttonCreateRole: string;
    inputSearchUserByEmail: string;
    buttonEditRole: string;
    buttonDeleteRole: string;
    // Role management
    labelTitleCreateRoleTitle: string;
    labelTitleCreateRoleDescription: string;
    labelEditRoleTitle: string;
    labelEditRoleDescription: string;
    inputRoleName: string;
    labelRoleName: string;
    listAccessTypePlaceholder: string;
    optionNetwork: string;
    optionMerchant: string;
    buttonGoToNextStep: string;
    checkboxProductionEnvironment: string;
    checkboxSandboxEnvironment: string;
    labelAccessType: string;
    labelSelectNetwork: string;
    labelSelectEnvironment: string;
    labelSandboxSelectionInfo: string;
    labelPermissions: string;
    inputSearchInList: string;
    buttonSaveRole: string;
    buttonSaveChanges: string;
    buttonCancel: string;
    labelRoleSavedSuccess: string;
    labelRoleEditedSuccess: string;
    alertSuccessDelete: string;
    labelReassignUsersModal: string;
    labelAssignAllTo: string;
    labelSelectRole: string;
    buttonContinue: string;
    labelRolePrefix: string;
    buttonViewRoleDetails: string;
    labelRoleNameDetail: string;
    labelNetworkNameDetail: string;
    labelEnvironmentsDetail: string;
    labelMerchantsDetail: string;
    buttonGoBack: string;
    labelOrdersPermissions: string;
    // User management
    labelTitleCreateUserTitle: string;
    labelTitleCreateUserDescription: string;
    buttonSaveUser: string;
    buttonCancelUserCreation: string;
    labelUserInfoStepTitle: string;
    inputUserName: string;
    inputUserEmail: string;
    labelUserNameDetail: string;
    labelUserEmailDetail: string;
    radioRole: string;
    radioPermissions: string;
    labelRadioRoleOrCustomPermissionsDetail: string;
    labelCustomRoleOrPermissionsStepTitle: string;
    buttonViewUserDetails: string;
    labelSaveUserConfirmationModal: string;
    buttonSaveUserConfirmationModal: string;
    buttonCancelConfirmationModal: string;
    labelUserSavedSuccess: string;
    labelEmailInUseErrorModal: string;
    labelMissingPermissionsErrorMessage: string;
  };

  screenUsers: {
    labelTitleCreateUser: string;
    labelTitleViewOrEditUser: string;
    labelCreationFormTitle: string;
    labelEditionFormTitle: string;
    optionSuperadmin: string;
    optionMerchantOwner: string;
    optionMerchantAdmin: string;
    optionMerchantUser: string;
    optionNetwork: string;
    optionMerchant: string;
    labelInputSearch: string;
    labelOptionSelectAll: string;
    labelCreateNewUserPermissionsTitle: string;
    labelCreateNewUserPermissionsDescription: string;
    labelUserPermissionsTitle: string;
    labelUserPermissionsDescription: string;
    labelPermissionsAlert: string;
    checkboxOrdersViewPermission: string;
    checkboxOrdersActionsPermission: string;
    checkboxMetricsViewPermission: string;
    checkboxReportsViewPermission: string;
    checkboxDownloadReportsPermission: string;
    checkboxConnectionsViewPermission: string;
    checkboxCreateAndEditConnectionPermission: string;
    checkboxErrorManagementViewPermission: string;
    checkboxErrorManagementEditPermission: string;
    checkboxPaymentStrategiesViewPermission: string;
    checkboxCreateEditAndDeletePaymentStrategiesPermission: string;
    checkboxInstallmentsSettingsViewPermission: string;
    checkboxCreateEditAndDeleteMSICampaignsPermission: string;
    checkboxViewRolesAndPermissionsPermission: string;
    checkboxCreateAndEditUsersPermission: string;
    checkboxDeactivateUsersPermission: string;
    checkboxCommerceViewPermission: string;
    checkboxBatchProcessingViewPermission: string;
    checkboxReconciliationViewPermission: string;
    checkboxPaymentLinksViewPermission: string;
    checkboxEditFraudSettingsPermission: string;
    checkboxEditBatchProcessingPermission: string;
    checkboxEditPaymentLinksPermission: string;
    buttonChangeFraudConfiguration: string;
    checkboxCheckoutBuilderPermission: string;
    checkboxEditCheckoutBuilderPermission: string;
    checkboxExportReconciliationsPermission: string;
    buttonCancel: string;
    buttonConfirmCreation: string;
    buttonSaveEditionChanges: string;
    labelCreationConfirmationModalTitle: string;
    labelEditionConfirmationModalTitle: string;
    buttonModalConfirm: string;
    buttonModalCancel: string;
    buttonReturn: string;
  };

  screenErrorManagementSelectors: {
    confirmText: string;
    retryText: string;
    declineText: string;
  };

  screenOrdersSelectors: {
    buttonExport: string;
    labelExportDrawerTitle: string;
    inputFileNamePlaceholder: string;
    selectOrderReportType: string;
    selectAuthVsCatchReportType: string;
    labelConfirmExportButton: string;
    buttonOpenScheduleReportsOptions: string;
    inputSearchByEmailOrId: string;
    inputSearchByEmail: string;
    labelOrdersPageTitle: string;
    labelNotAvailableInfo: string;
    labelAdvancedFilters: string;
    buttonMoreFilters: string;
    labelMoreFilters: string;
    labelCloseFilterSelect: string;
    labelOrderColumn: string;
    labelOrderCreation: string;
    selected: string;
    clearFilter: string;
    of: string;
  };

  screenNotifications: {
    labelEnableFraudConnectionNotification: string;
    labelCreateStrategyRuleNotification: string;
    labelCreateStrategyRule: string;
  };

  screenInstallmentsSelectors: {
    createCampaignTitle: string;
    step1NameAndDescription: string;
    step2CampaignValidity: string;
    step3PaymentReceiver: string;
    step4InstallmentsConfig: string;
    configMonthTitle: string;
  };

  screenReportsHistory: {
    labelTitleReports: string;
    orderReportState: string;
    rowPerPage: string;
    buttonCloseSuccessModal: string;
  };

  screenReconciliations: {
    labelTitleReconciliations: string;
    exportButton: string;
  };

  screenActivityRegistry: {
    label3DSEvaluationStarted: string;
    label3DSEvaluationUpdated: string;
    labelNewOrder: string;
    labelGeneratePayment: string;
    labelRequestAuthorization: string;
    labelRequestCapture: string;
    labelRequestPartialRefund: string;
    labelOrderUpdated: string;
    labelRequestVoid: string;
    labelRequestPaymentRouting: string;
    labelRequestRefund: string;
    labelRequestPartialCapture: string;
  };

  screenPaymentLink: {
    labelTitlePaymentLink: string;
    labelTitleCreatePaymentLink: string;
    labelSectionHeaderTitle: string;
    buttonCreatePaymentLink: string;
    buttonSaveProduct: string;
    buttonAddProduct: string;
    savedProductName: string;
    savedProductAmount: string;
    savedProductCurrency: string;
    checkboxTaxes: string;
    checkboxShipping: string;
    checkboxDueDate: string;
    buttonFooterCancel: string;
    buttonFooterCreatePaymentLink: string;
    labelModalTitle: string;
    labelModalTotalAmount: string;
    labelDetailsPageDescription: string;
    buttonGoBack: string;
    buttonCopyInformation: string;
    productName: string;
    productAmount: string;
    searchByName: string;
    searchByDate: string;
    stateSelect: string;
  };

  screenPaymentLinkDetails: {
    buttonGoBack: string;
  };

  screenSubscriptions: {
    labelTitleSubscriptions: string;
    planName: string;
    billingAmount: string;
    createdAt: string;
    status: string;
    idSubscription: string;
    email: string;
    planNameSubscriptions: string;
    billingAmountSubscriptions: string;
    createdAtSubscriptions: string;
    createdAtEndSubscriptions: string;
    statusSubscriptions: string;
  };
  subscriptionPauseOptions: {
    pauseImmediately: string;
    pauseAtEndOfCycle: string;
    pauseOnSpecificDate: string;
  };
  subscriptionReactivateOptions: {
    reactivateImmediately: string;
    reactivateAtEndOfCycle: string;
    reactivateOnSpecificDate: string;
  };
  subscriptionCancelOptions: {
    immediate: string;
    atPeriodEnd: string;
    atDate: string;
  };
  subscriptionStatuses: {
    active: string;
    paused: string;
    canceled: string;
  };
  screenMetrics: {
    labelToday: string;
  };
  screenSpecificRule: {
    buttonCreateSpecificRule: string;
    buttonNextStep: string;
    buttonAddCondition: string;
    buttonCreateRouting: string;
    buttonActive: string;
  };
  screenBatchProcessing: {
    labelTitleBatchProcessing: string;
    placeholderInputName: string;
  };
}
