import { BaseValidationCreateError } from './baseValidationCreateError';

/**
 * @description This return happen with error body to create installment
 */

const createErrorMissingName: BaseValidationCreateError = {
  statusCode: 400,
};

const createErrorMissingStatus: BaseValidationCreateError = {
  statusCode: 400,
};

const createErrorInvalidStatus: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'invalid installment campaign status',
};

const createErrorMissingLanguage: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-013: display_label_template is invalid',
};

const createErrorNoMSI: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-013: display_label_template is invalid',
};

const createErrorNoMCI: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-013: display_label_template is invalid',
};

const createErrorEndDateLowerStartDate: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-014: end date should not be before than start date',
};

const createErrorMissingProcessor: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-015: at least one processor is required',
};

const createErrorMissingOptions: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-016: at least one option is required',
};

const createErrorMissingProcessorID: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-019: processor id is required',
};

const createErrorAmountMinLowerZero: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-017: amount min and amount max should not be lower than zero',
};

const createErrorAmountMaxLowerZero: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-017: amount min and amount max should not be lower than zero',
};

const createErrorAmountMaxLowerAmountMin: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-018: amount max should not be lower than amount min',
};

const createErrorInvalidInstallmentType: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-007: installments_type is invalid, only MSI or MCI is allowed',
};

const createErrorInvalidCurrency: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-010: currency format invalid',
};

const createErrorCostLowerZero: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-011: cost not percentage found in rules',
};

const createErrorCostGreaterOneHundred: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-011: cost not percentage found in rules',
};

const createErrorRateLowerZero: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-012: installment_rate not percentage found in rules',
};

const createErrorRateGreaterOneHundred: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-012: installment_rate not percentage found in rules',
};

const createErrorNoName: BaseValidationCreateError = {
  statusCode: 400,
  code: 400,
  error: 'IC-009: card_branch empty name',
};

export {
  createErrorMissingName,
  createErrorMissingStatus,
  createErrorInvalidStatus,
  createErrorMissingLanguage,
  createErrorNoMSI,
  createErrorNoMCI,
  createErrorEndDateLowerStartDate,
  createErrorMissingProcessor,
  createErrorMissingOptions,
  createErrorMissingProcessorID,
  createErrorAmountMinLowerZero,
  createErrorAmountMaxLowerZero,
  createErrorAmountMaxLowerAmountMin,
  createErrorInvalidInstallmentType,
  createErrorInvalidCurrency,
  createErrorCostLowerZero,
  createErrorCostGreaterOneHundred,
  createErrorRateLowerZero,
  createErrorRateGreaterOneHundred,
  createErrorNoName,
};
