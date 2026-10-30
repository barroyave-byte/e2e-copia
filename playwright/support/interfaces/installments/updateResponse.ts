import { BaseValidationUpdate } from './baseValidationUpdate';

/**
 * @description This return happen with success body update
 */
const updateBodySuccess: BaseValidationUpdate = {
  statusCode: 200,
  code: 200,
  dataStatus: 'inactive',
};

const updateInvalidStatus: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'invalid installment campaign status',
};

const updateEndDateLowerStartDate: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-014: end date should not be before than start date',
};

const updateMissingProcessor: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-015: at least one processor is required',
};

const updateMissingOptions: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-016: at least one option is required',
};

const updateMissingProcessorID: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-019: processor id is required',
};

const updateAmountMinLowerZero: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-017: amount min and amount max should not be lower than zero',
};

const updateAmountMaxLowerZero: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-017: amount min and amount max should not be lower than zero',
};

const updateAmountMaxLowerAmountMin: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-018: amount max should not be lower than amount min',
};

const updateInvalidInstallmentType: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-007: installments_type is invalid, only MSI or MCI is allowed',
};

const updateInvalidCurrency: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-010: currency format invalid',
};

const updateCostLowerZero: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-011: cost not percentage found in rules',
};

const updateCostGreaterOneHundred: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-011: cost not percentage found in rules',
};

const updateRateLowerZero: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-012: installment_rate not percentage found in rules',
};

const updateRateGreaterOneHundred: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-012: installment_rate not percentage found in rules',
};

const updateNoName: BaseValidationUpdate = {
  statusCode: 400,
  code: 400,
  error: 'IC-009: card_branch empty name',
};

export {
  updateBodySuccess,
  updateInvalidStatus,
  updateEndDateLowerStartDate,
  updateMissingProcessor,
  updateMissingOptions,
  updateMissingProcessorID,
  updateAmountMinLowerZero,
  updateAmountMaxLowerZero,
  updateAmountMaxLowerAmountMin,
  updateInvalidInstallmentType,
  updateInvalidCurrency,
  updateCostLowerZero,
  updateCostGreaterOneHundred,
  updateRateLowerZero,
  updateRateGreaterOneHundred,
  updateNoName,
};
