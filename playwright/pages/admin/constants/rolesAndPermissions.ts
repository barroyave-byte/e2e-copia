export const RESOURCES = {
  home: 'home_view-home',
  conciliations: 'conciliations_view-conciliations',
  metrics: 'metrics_view-metrics',
  batchProcessing: 'batchprocessing_view-batchprocessing',
  commerce: 'commerce_view-commerce',
  checkoutConfig: 'checkoutconfig_view-checkoutconfig',
  connections: 'connections_view-connections',
  errorManagement: 'errormanagement_view-errormanagement',
  installments: 'installments_view-installments',
  reports: 'reports_view-reports',
  routing: 'routing_view-routing',
  rolesAndPermissions: 'rolesandpermissions_view-rolesandpermissions',
  orders: 'orders_view-orders',
  paymentLink: 'paymentlink_view-paymentlink',
  metricsReconciliations: 'metrics_tab-reconciliations',
  commerceVoucherTab: 'commerce_tab-voucher',
  commercePaymentsConfigTab: 'commerce_tab-paymentsconfig',
  commerceSecurityTab: 'commerce_tab-view-security-section',
  subscriptions: 'subscriptions_view-subscriptions',
  reconciliations: 'reconciliations_view-reconciliations',
  notifications: 'notifications_view-notifications',
  logs: 'audit_view-logs',
  exportLogs: 'audit_export-logs',
} as const;

export const ACTIONS = {
  editPaymentLink: 'paymentlink_edit-paymentlink',
  editConnections: 'connections_edit-connections',
  editVoucher: 'commerce_edit-voucher',
  editRouting: 'routing_edit-routing',
  scheduleReport: 'reports_schedule-reports',
  downloadReports: 'reports_download-reports',
  editInstallments: 'installments_edit-installments',
  editCommerceConfig: 'commerce_edit-paymentsconfig',
  editFraudConditions: 'commerce_edit-fraud-conditions',
  editManage2faPolicy: 'commerce_edit-manage-2fa-policy',
  editMPC: 'commerce-editMPC',
  editErrorManagement: 'errormanagement_edit-errormanagement',
  editBatchProcessing: 'batchprocessing_edit-batchprocessing',
  editCheckoutConfig: 'checkoutconfig_edit-checkoutconfig',
  createRole: 'rolesandpermissions_create-role',
  editRole: 'rolesandpermissions_edit-role',
  deleteRole: 'rolesandpermissions_delete-role',
  createUser: 'rolesandpermissions_create-user',
  createUserWithRole: 'rolesandpermissions_create-user-with-role',
  createUserWithCustomPermissions: 'rolesandpermissions_create-user-with-custom-permissions',
  enableUser: 'rolesandpermissions_enable-user',
  editUser: 'rolesandpermissions_edit-user',
  disableUser: 'rolesandpermissions_disable-user',
  reset2fa: 'rolesandpermissions_reset-2fa',
  editPaymentOperations: 'orders_payments-operations',
  exportAdhocReports: 'orders_export-adhoc-reports',
  createDatasourceRecon: 'recon_create-datasource',
  uploadDatasourceRecon: 'recon_upload-datasource',
  deleteDatasourceRecon: 'recon_delete-datasource',
  exportConciliationRecon: 'recon_export-conciliations',
  createEditReconciliations: 'reconciliations_create-edit-reconciliations',
} as const;

export const ENVIRONMENTS = {
  production: 'production',
  sandbox: 'sandbox',
} as const;

export const ROLE_OR_CUSTOM_PERMISSIONS = {
  role: 'role',
  permissions: 'permissions',
} as const;

// Value for `merchant` is 'merchants' (plural) to match admin-ff's actual
// ACCESS_TYPE wire value (src/core/shared/domain/constants/roles-and-permissions.ts);
// only the TS property name stays singular.
export const ACCESS_TYPE = {
  merchant: 'merchants',
  network: 'network',
} as const;

export const MERCHANT_V3: { id: string; name: string } = {
  id: 'fb0719aa-e981-4d76-bc11-65b260ac0826',
  name: 'Jakubowski, Greenfelder and Reichert',
};

export const MERCHANT_V3_STG: { id: string; name: string } = {
  id: 'bad17078-6ff3-47f5-aeef-3fd2bef869b3',
  name: 'Merchant Solito E2E',
};

export const EDIT_BUTTON_IDS = {
  accessType: 'labelAccessType',
  selectEnvironment: 'labelSelectEnvironment',
  permissions: 'labelPermissions',
} as const;

export const ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE = 'roles-and-permissions';

export const ROLES_AND_PERMISSIONS_DATA_TEST_IDS = {
  stepCard: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-step-card`,
  stepCardNextButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-step-card-button-next`,
  stepCardEditButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-step-card-button-edit`,
  stepperFooter: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-stepper-footer`,
  stepperFooterConfirmButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-stepper-footer-button-confirm`,
  stepperFooterCancelButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-stepper-footer-button-cancel`,
  stepperRoleConfirmModalButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-role-confirm-button`,
  stepperRoleCancelModalButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-role-cancel-button`,
  environmentSandboxInfoAlert: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-environment-sandbox-info-alert`,
  environmentCheckboxProduction: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-environment-checkbox-production`,
  environmentCheckboxSandbox: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-environment-checkbox-sandbox`,
  inputSelectAccessType: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-select-accessType`,
  inputSelectOptionSelectAll: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-option-selectAll`,
  alertUserCreatedSuccess: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-alert-user-created-success`,
  alertUserBannedSuccess: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-alert-user-banned-success`,
  alertUserUpdatedSuccess: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-alert-users-update-success`,
  inputSearchUsers: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-search-users`,
  roleSelect: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-role`,
  roleSelectInputSearch: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-search-role-select`,
  usersTab: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-filter-tab-users`,
  rolesTab: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-filter-tab-roles`,
  rolesAndPermissionsTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-title`,
  alertMissingPermissionsErrorMessage: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-permissions-step-alert-error`,
  permissionsStepColumnHeaderCheckbox: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-column-header-checkbox`,
  manageRoleDescription: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-manage-role-description`,
  manageUserDescription: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-manage-user-description`,
  roleTypeCardIndividualizedRadio: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-type-card-individualized-radio`,
  roleTypeCardRoleRadio: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-type-card-custom-radio`,
  selectAccessType: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-access-type`,
  selectNetwork: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-network`,
  selectNetworkInputSearch: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-search-network-select`,
  selectMerchants: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-merchant`,
  selectMerchantInputSearch: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-search-merchant-select`,
  permissionsStepCard: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-permissions-step-card`,
  selectNetworkMerchants: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-networkMerchants-combobox-container-trigger`,
  selectNetworkMerchantsInputSearch: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-networkMerchants-combobox-input-search`,
  selectMerchantOptionPrefix: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-merchant-option-`,
  selectNetworkOptionPrefix: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-network-option-`,
  networkMerchantsOptionAll: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-networkMerchants-option-all`,
  networkMerchantsOptionPrefix: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-networkMerchants-option-`,
  buttonGoBack: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-button-go-back`,
  buttonCreateRole: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-button-create-role`,
  buttonCreateUser: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-button-create-user`,
  usersTable: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-users-table`,
  roleNameInput: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-role-name`,
  userNameInput: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-user-name`,
  userEmailInput: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-input-user-email`,
  modalRoleConfirmButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-role-confirm-button`,
  modalRoleCancelButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-role-cancel-button`,
  modalUserConfirmButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-user-confirm-button`,
  modalUserCancelButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-user-cancel-button`,
  // ReassignUsersDialog (roles-with-assigned-users delete flow) -- a real
  // dialog (single confirm step), not the drawer/2-step-modal shape the
  // former drawerAssignRole* names assumed. Verified live against
  // admin-ff/src/.../Roles/components/ReassignUsersDialog.
  reassignUsersDialogTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-title`,
  reassignUsersDialogDescription: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-description`,
  reassignUsersDialogContainer: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-container`,
  reassignUsersDialogCancelButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-cancel-button`,
  reassignUsersDialogContinueButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-continue-button`,
  reassignUsersDialogBatchModeButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-batch-mode-button`,
  reassignUsersDialogManualModeButton: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-manual-mode-button`,
  reassignUsersDialogBatchRoleSelect: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-batch-role-select`,
  // Success toast for the reassignment step specifically -- previously had no
  // testid at all in admin-ff (onShowNotification call omitted dataTestId);
  // patched uncommitted to wire it up.
  reassignUsersDialogSuccessAlert: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-users-dialog-success-alert`,
  reassignRoleOptionPrefix: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-reassign-role-option-`,
  dropdownMenu: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-dropdown-menu`,
  // Page-level titles (SectionHeader, ManageRole.tsx / ManageUser.tsx) -- same
  // testid for create/edit/view mode, only the text content differs.
  manageRoleTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-manage-role-title`,
  manageUserTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-manage-user-title`,
  // Create-user confirmation modal title (admin-ff patch: wired dataTestIds.title
  // on the dialog() call in useCreateUser.ts -- the Dialog organism already
  // supported it, it just wasn't passed).
  modalUserCreateConfirmationTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-modal-user-create-confirmation-title`,
  // RoleForm.tsx / UserForm.tsx section headings (admin-ff patch: wired FormCard's
  // existing `titleTestId` prop, which wasn't being passed for any section).
  roleFormRoleNameSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-form-section-role-name-title`,
  roleFormAccessTypeSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-form-section-access-type-title`,
  roleFormEnvironmentSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-form-section-environment-title`,
  userFormUserInfoSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-form-section-user-info-title`,
  userFormRoleOrPermissionsSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-form-section-role-or-permissions-title`,
  userFormEnvironmentSectionTitle: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-form-section-environment-title`,
  // UserDetail.tsx / RoleDetail.tsx read-only field wrappers (admin-ff patch: wired
  // DetailField's existing `dataTestId` prop, which wasn't being passed for any field).
  userDetailFieldName: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-name`,
  userDetailFieldEmail: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-email`,
  userDetailFieldRole: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-role`,
  userDetailFieldAccessType: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-access-type`,
  userDetailFieldNetwork: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-network`,
  userDetailFieldCommerces: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-commerces`,
  userDetailFieldEnvironment: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-environment`,
  userDetailFieldAccessScope: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-detail-field-access-scope`,
  roleDetailFieldName: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-name`,
  roleDetailFieldEnvironment: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-environment`,
  roleDetailFieldAccessType: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-access-type`,
  roleDetailFieldNetwork: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-network`,
  roleDetailFieldCommerces: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-commerces`,
  roleDetailFieldCreatedAt: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-created-at`,
  roleDetailFieldDescription: `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-role-detail-field-description`,
};

export const RESUME_STEP_DYNAMIC_DATA_TEST_ID = {
  step: (stepName: string) => `resume-step-${stepName}`,
  value: (value: string) => `resume-step-value-${value}`,
} as const;

export const ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS = {
  alertAction: (type: string, action: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-alert-${type}-${action}`,
  alertActionWithSeverity: (type: string, action: string, severity?: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-alert-${type}-${action}${severity ? `-${severity}` : ''}`,
  collapseHeaderTitle: (resourceName: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-collapse-header-title-${resourceName}`,
  // Used by the "select" variant of AccessTypeStep (UserForm's individualized path);
  // RoleForm uses the "card" variant, whose option testid is accessTypeCardRadio.
  selectAccessTypeOption: (accessTypeValue: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-select-access-type-option-${accessTypeValue}`,
  // Access type is now a RadioCardGroup (was a select+option dropdown); each card's radio
  // control carries this testid directly (see admin-ff RoleForm/UserForm -> AccessTypeStep).
  accessTypeCardRadio: (accessTypeValue: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-access-type-card-${accessTypeValue}-radio`,
} as const;
