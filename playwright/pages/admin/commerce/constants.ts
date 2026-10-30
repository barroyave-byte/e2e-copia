export const DATA_TEST_ID_SCOPE = 'commerce';

export const COMMERCE_DATA_TEST_IDS = {
  tabCommerceEmail: `${DATA_TEST_ID_SCOPE}-filter-tab-notification`,
  tabCommerceInformation: `${DATA_TEST_ID_SCOPE}-filter-tab-information`,
  tabPaymentsConfig: `${DATA_TEST_ID_SCOPE}-filter-tab-fraud`,
};

export const PAYMENT_CONFIGURATIONS_TAB_DATA_TEST_IDS = {
  MANUAL_REVIEW: `${DATA_TEST_ID_SCOPE}-payment-configurations-switch-manual-review`,
  AUTOMATIC_OPERATIONS: `${DATA_TEST_ID_SCOPE}-payment-configurations-switch-automatic-operations`,
  ORDER_FOLLOW_UP: `${DATA_TEST_ID_SCOPE}-payment-configurations-switch-order-follow-up`,
  SHADOW_MODE: `${DATA_TEST_ID_SCOPE}-payment-configurations-switch-shadow-mode`,
  STATE_CODE: `${DATA_TEST_ID_SCOPE}-payment-configurations-switch-state-code`,
} as const;

export const CUSTOMER_NOTIFICATION_DATA_TEST_IDS = {
  paymentSuccessfullyCheckbox: 'check-payment-successfully',
  refundsCheckbox: 'check-refunds',
  saveEmailsButton: 'save-voucher-refunds',
  saveEmailsConfirmButton: 'commerce-notification-save-emails-confirm-button',
  termsAndConditionsCheckbox: 'check-terms-and-conditions',
  termsAndConditionsInput: 'input-terms-and-conditions',
  privacyPolicyCheckbox: 'check-privacy-policy',
  privacyPolicyInput: 'input-privacy-policy',
  saveAttachmentsButton: 'save-voucher-config',
} as const;
