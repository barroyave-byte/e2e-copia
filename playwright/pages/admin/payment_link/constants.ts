export const DATA_TEST_ID_SCOPE = 'payment-link';
export const DATA_TEST_ID_SCOPE_FORM = `${DATA_TEST_ID_SCOPE}-form`;
export const DATA_TEST_IDS = {
  TITLE_SECTION: `${DATA_TEST_ID_SCOPE}-title`,
  DESCRIPTION_SECTION: `${DATA_TEST_ID_SCOPE}-description`,
  CREATE_LINK_BUTTON: `${DATA_TEST_ID_SCOPE}-create-button`,
  INPUT_PAYMENT_LINK_NAME: `${DATA_TEST_ID_SCOPE_FORM}-input-payment-link-name`,
  INPUT_PRODUCT_NAME: `${DATA_TEST_ID_SCOPE_FORM}-input-product-name`,
  INPUT_TOTAL_AMOUNT: `${DATA_TEST_ID_SCOPE_FORM}-input-total-amount`,
  INPUT_TAX_AMOUNT: `${DATA_TEST_ID_SCOPE_FORM}-input-tax-amount`,
  INPUT_SHIPPING_AMOUNT: `${DATA_TEST_ID_SCOPE_FORM}-input-shipping-amount`,
  DUE_DATE_PICKER_SCOPE: `${DATA_TEST_ID_SCOPE_FORM}-due-date`,
  INPUT_DUE_DATE: `${DATA_TEST_ID_SCOPE_FORM}-due-date-input-date-range`,
  TAXES_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-taxes`,
  SHIPPING_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-shipping`,
  DUE_DATE_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-due-date`,
  SUCCESSFUL_PAYMENT_LIMIT_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-successful-payment-limit`,
  PAYMENT_RETRIES_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-payment-retries`,
  CUSTOM_CONFIRM_PAGE_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-custom-confirm-page`,
  PAYMENT_METHOD_CREDIT_CARD_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-payment-method-credit-card`,
  PAYMENT_METHOD_DEBIT_CARD_CHECKBOX: `${DATA_TEST_ID_SCOPE_FORM}-checkbox-payment-method-debit-card`,
  PAYMENT_METHOD_CHECKBOX: (name: string) =>
    `${DATA_TEST_ID_SCOPE_FORM}-checkbox-payment-method-${name}`,
  INPUT_PAYMENT_RETRIES: `${DATA_TEST_ID_SCOPE}-paymentRetriesLimitCount`,
  INPUT_MAX_COMPLETED_PURCHASES_LIMIT: `${DATA_TEST_ID_SCOPE}-successfulPaymentLimitCount`,
  BUTTON_SAVE_PRODUCT: `${DATA_TEST_ID_SCOPE_FORM}-button-save-product`,
  FOOTER_BUTTON_CANCEL: `${DATA_TEST_ID_SCOPE_FORM}-footer-button-cancel`,
  FOOTER_BUTTON_CREATE: `${DATA_TEST_ID_SCOPE_FORM}-footer-button-create`,
  BUTTON_ADVANCED_CONFIG_ACCORDION: `${DATA_TEST_ID_SCOPE_FORM}-button-advanced-config-accordion`,
  TABLE_ROW: (paymentLinkId: string) => `${DATA_TEST_ID_SCOPE}-table-row-${paymentLinkId}`,
} as const;

const MODAL_SCOPE = `${DATA_TEST_ID_SCOPE_FORM}-modal`;
export const MODAL_DATA_TEST_IDS = {
  MODAL_CONTAINER: MODAL_SCOPE,
  MODAL_TITLE: `${MODAL_SCOPE}-title`,
  MODAL_TOTAL_AMOUNT: `${MODAL_SCOPE}-total-amount`,
  MODAL_INPUT_LINK: `${MODAL_SCOPE}-input-link`,
  MODAL_BUTTON_COPY: `${MODAL_SCOPE}-button-copy`,
  MODAL_BUTTON_CLOSE: `${MODAL_SCOPE}-button-close`,
} as const;

const DETAILS_SCOPE = `${DATA_TEST_ID_SCOPE}-details`;
export const DETAILS_PAGE_DATA_TEST_IDS = {
  DESCRIPTION_SECTION: `${DETAILS_SCOPE}-description`,
  BUTTON_EDIT: `${DETAILS_SCOPE}-button-edit`,
  FOOTER_GO_BACK_BUTTON: `${DETAILS_SCOPE}-footer-button-go-back`,
  ORDERS_TABLE: `${DETAILS_SCOPE}-table`,
} as const;
