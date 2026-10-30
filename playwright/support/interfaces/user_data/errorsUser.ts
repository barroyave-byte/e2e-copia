import { BaseValidationUser } from './baseValidationUser';

/**
 * @description This error is returned when the merchant tries to register that already exists in the network used by the merchant
 */
const errorUserAlreadyExists: BaseValidationUser = {
  statusCode: 409,
  errorCode: 'error.entity_already_exists',
  errorDescription: 'user already exists',
};

export { errorUserAlreadyExists };
