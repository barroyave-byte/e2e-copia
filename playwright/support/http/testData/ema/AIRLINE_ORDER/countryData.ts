import { CountryCodes } from '@support/interfaces/countryCodeTypes';

export interface AirlineOrderCountryData {
  currency: string;
  default_amount: number;
  billing_address: {
    phone: string;
    identity_document: string;
    lat: number;
    lng: number;
    address1: string;
    address2: string;
    city: string;
    zipcode: string;
    state_name: string;
    country: string;
    country_code: string;
  };
}

export const COUNTRY_DATA: Partial<Record<CountryCodes, AirlineOrderCountryData>> = {
  US: {
    currency: 'USD',
    default_amount: 1300,
    billing_address: {
      phone: '5551234567',
      identity_document: '35795005894',
      lat: 38.5816,
      lng: -121.4944,
      address1: 'Fair Oaks Blvd 3626',
      address2: 'Suite 100',
      city: 'Sacramento',
      zipcode: '95864',
      state_name: 'CA',
      country: 'US',
      country_code: 'US',
    },
  },
};
