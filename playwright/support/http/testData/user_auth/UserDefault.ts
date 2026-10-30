import { RegisterUserRequestData } from '../../models/userAuth';

/**
 * Default address data for user address creation
 * Following the testData architecture pattern for managing request bodies
 */
export const DEFAULT_USER_DATA: RegisterUserRequestData = {
  email: 'e2e@deuna.com',
  first_name: 'QA TEST',
  last_name: 'Automation',
  phone: '+528886637598',
  identity_document: 'XAXX010101000',
};
