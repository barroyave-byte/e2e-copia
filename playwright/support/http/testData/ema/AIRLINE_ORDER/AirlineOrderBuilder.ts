import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as crypto from 'crypto';
import {
  AirlineAncillary,
  AirlineBookingItem,
  AirlineLeg,
  AirlinePassenger,
  TokenizeOrderRequestData,
} from '@support/http/models/order';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { COUNTRY_DATA } from './countryData';

/**
 * Options for customizing an AIRLINE_ORDER tokenization.
 * All fields are optional — country-specific defaults come from countryData.
 */
export interface AirlineOrderOptions {
  order_id?: string;
  amount?: number;
  billing_email?: string;
  billing_first_name?: string;
  billing_last_name?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_city?: string;
  billing_phone?: string;
  billing_identity_document?: string;
  billing_state_name?: string;
  billing_zipcode?: string;
  passenger?: Partial<AirlinePassenger>;
  legs?: AirlineLeg[];
  ancillaries?: AirlineAncillary[];
}

const DEFAULT_PASSENGER: AirlinePassenger = {
  first_name: 'John',
  middle_name: 'Paul',
  last_name: 'Doe',
  date_of_birth: '2000-06-27',
  document_type: '',
  email: '',
  frequent_flyer_code: '',
  identity_document_number: '',
  phone: '',
  title: '',
  user_id: '',
};

const DEFAULT_LEGS: AirlineLeg[] = [
  {
    carrier_code: 'AM',
    flight_number: '12345',
    fare_basis_code: 'RNNB0A',
    service_class: 'V',
    origin: { iata_code: 'JFK', date: '2027-04-15', time: '15:30' },
    destination: { iata_code: 'SIN', date: '2027-04-16', time: '17:30' },
    carrier_name: '',
    seat_location: '',
    stopover_code: '',
  },
];

const DEFAULT_ANCILLARIES: AirlineAncillary[] = [
  {
    category_code: 'BG',
    sub_category_code: 'J',
    fee_code: 'CO',
    unit_price: 930,
    ticket_number: '123456789',
  },
];

/**
 * Builder for AIRLINE_ORDER tokenization requests.
 * Address, currency and default amounts are driven by countryData to avoid hardcoding.
 *
 * @example Basic usage
 * await emaService.tokenizeAirlineOrder('US', privateKey);
 *
 * @example Override amount and passenger
 * await emaService.tokenizeAirlineOrder('US', privateKey, {
 *   amount: 5000,
 *   passenger: { first_name: 'Jane', last_name: 'Doe' },
 * });
 */
export class AirlineOrderBuilder {
  static createOrder(
    country: CountryCodes,
    options: AirlineOrderOptions = {}
  ): TokenizeOrderRequestData {
    const countryData = COUNTRY_DATA[country];

    if (!countryData) {
      throw new Error(`Unsupported country code for AIRLINE_ORDER: ${country}`);
    }

    const {
      order_id = crypto.randomUUID(),
      amount,
      billing_email = EmailGenerator.generatePayerEmail(),
      billing_first_name = 'Jhon',
      billing_last_name = 'Doe',
      billing_address1,
      billing_address2,
      billing_city,
      billing_phone,
      billing_identity_document,
      billing_state_name,
      billing_zipcode,
      passenger,
      legs = DEFAULT_LEGS,
      ancillaries = DEFAULT_ANCILLARIES,
    } = options;

    const finalAmount = amount ?? countryData.default_amount;
    const displayAmount = `${countryData.currency} ${(finalAmount / 100).toFixed(2)}`;

    const mergedPassenger: AirlinePassenger = {
      ...DEFAULT_PASSENGER,
      ...passenger,
    };

    const bookingItem: AirlineBookingItem = {
      ticket_number: '123456789',
      pnr: 'WWSENGK1789',
      ticketing_travel_agency: {
        name: 'Agency',
        agency_invoice_number: '',
        iata_code: '',
      },
      e_ticket: true,
      passenger: mergedPassenger,
      legs,
      ancillaries,
      airline_3_digit_code: '',
      airline_iata_designator: '',
    };

    const addr = countryData.billing_address;

    return {
      order_type: 'AIRLINE_ORDER',
      order: {
        order_id,
        store_code: 'all',
        currency: countryData.currency,
        tax_amount: finalAmount,
        items_total_amount: finalAmount,
        sub_total: finalAmount,
        total_amount: finalAmount,
        display_total_amount: displayAmount,
        airline_information: {
          booking_items: [bookingItem],
        },
        billing_address: {
          identification: '050623568956124',
          id: 0,
          user_id: '',
          first_name: billing_first_name,
          last_name: billing_last_name,
          phone: billing_phone ?? addr.phone,
          identity_document: billing_identity_document ?? addr.identity_document,
          lat: addr.lat,
          lng: addr.lng,
          address1: billing_address1 ?? addr.address1,
          address2: billing_address2 ?? addr.address2,
          city: billing_city ?? addr.city,
          zipcode: billing_zipcode ?? addr.zipcode,
          state_name: billing_state_name ?? addr.state_name,
          country: addr.country,
          country_code: addr.country_code,
          additional_description: 'Description',
          address_type: 'home',
          is_default: false,
          created_at: '2021-11-03T22:09:09.086990957Z',
          updated_at: '2021-11-03T22:09:09.087014623Z',
          email: billing_email,
        },
      },
    };
  }
}
