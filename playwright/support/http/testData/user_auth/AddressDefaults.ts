import { AddressUserRequestData } from '../../models/userAuth';

/**
 * Default address data for user address creation
 * Following the testData architecture pattern for managing request bodies
 */
export const DEFAULT_ADDRESS_DATA: AddressUserRequestData = {
  additional_description: 'e2e automation',
  address1: 'Av. Río Churubusco 410, Amp Sinatel, Iztapalapa, 09479 Ciudad de México, CDMX, Mexico',
  address2: '',
  address_type: 'home',
  city: 'Ciudad de México',
  country: 'MX',
  first_name: 'Automation',
  identity_document: '',
  is_billing_address: false,
  is_default: true,
  last_name: 'e2e',
  lat: 19.3875468,
  lng: -99.1317371,
  phone: '',
  state_name: 'Ciudad de México',
  zipcode: '04100'
};
