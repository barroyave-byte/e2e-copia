import { CountryCodes } from '@support/interfaces/countryCodeTypes';
export interface BaseUserAddressCreditCard {
  address1: string;
  city: string;
  country: CountryCodes;
  phone: string;
  state: string;
  zip: string;
}
