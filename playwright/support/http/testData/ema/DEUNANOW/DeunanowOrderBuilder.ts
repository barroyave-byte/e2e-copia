import { TokenizeOrderRequestData } from '@support/http/models/order';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { COUNTRY_DATA } from './countryData';
import { faker } from '@faker-js/faker';
import * as crypto from 'crypto';

/**
 * Options for customizing DEUNA_NOW order
 */
export interface DeunanowOrderOptions {
  order_id?: string;
  store_code?: string;
  user_email?: string;
  amount?: number;
  checkout_modules?: any[];
  market_type?: string;
  discount_amount?: number;
  shipping_amount?: number;
  billing_first_name?: string;
  billing_last_name?: string;
  expires_at?: string;
  billing_phone?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_city?: string;
  billing_zipcode?: string;
  billing_state_name?: string;
  billing_identity_document?: string;
  shipping_address2?: string;
}

/**
 * Builder class for DEUNA_NOW orders with country-specific data
 */
export class DeunanowOrderBuilder {
  /**
   * Creates a DEUNA_NOW order body with country-specific modifications
   * 
   * @param country - The country code to use for localization
   * @param options - Optional customizations for the order
   * @returns Complete TokenizeOrderRequestData for DEUNA_NOW
   */
  static createOrder(
    country: CountryCodes,
    options: DeunanowOrderOptions = {}
  ): TokenizeOrderRequestData {
    const countryData = COUNTRY_DATA[country];
    
    if (!countryData) {
      throw new Error(`Unsupported country code: ${country}`);
    }

    const {
      order_id = `${crypto.randomUUID()}`,
      store_code = 'all',
      user_email = `${faker.internet.email({firstName: `${crypto.randomUUID()}`})}`,
      amount,
      checkout_modules = [],
      market_type,
      discount_amount = 0,
      shipping_amount,
      billing_first_name = 'NELSON',
      billing_last_name = 'JIMENEZ',
      expires_at,
      billing_phone,
      billing_address1,
      billing_address2,
      billing_city,
      billing_zipcode,
      billing_state_name,
      billing_identity_document,
      shipping_address2,
    } = options;

    // Use custom amount if provided, otherwise use countryData values
    const finalAmount = amount ?? countryData.total_amount;
    const displayAmount = `${countryData.currency} ${(finalAmount / 100).toFixed(2)}`;

    return {
      order_type: 'DEUNA_NOW',
      checkout_modules,
      order: {
        order_id,
        store_code,
        currency: countryData.currency,
        tax_amount: finalAmount,
        shipping_amount: shipping_amount ?? finalAmount,
        items_total_amount: finalAmount,
        sub_total: finalAmount,
        total_amount: finalAmount,
        display_total_amount: displayAmount,
        items: [
          {
            id: '79',
            name: '10 ALITAS VOLANTE',
            description: '10 alitas picantes',
            options: 'string option',
            total_amount: {
              amount: 1200,
              original_amount: 0,
              display_amount: `${countryData.currency} 12.00`,
              display_original_amount: `${countryData.currency} 30.00`,
              total_discount: 0,
              display_total_discount: `${countryData.currency} 0.00`,
            },
            unit_price: {
              amount: 850,
              display_amount: `${countryData.currency} 8.50`,
            },
            tax_amount: {
              amount: 100,
              display_amount: `${countryData.currency} 1.00`,
            },
            quantity: 1,
            uom: 'string',
            upc: 'string',
            sku: 'SKU-11021',
            isbn: '12-345-678-90123',
            brand: 'Bolt Swagstore',
            manufacturer: 'Bolt Factory',
            category: 'hats',
            color: 'Red',
            size: 'XXL',
            weight: {
              weight: 22,
              unit: 'kg',
            },
            image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
            details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
            type: 'physical',
            taxable: true,
            discounts: [],
            included_in_subscription: false,
          },
        ],
        discounts: [
          {
            amount: 500,
            display_amount: '',
            code: 'SUMMERFUN15',
            reference: 'SUMMERFUN15',
            description: '',
            details_url: 'https://boltswagstore.com/discounts/#12345',
            free_shipping: {
              is_free_shipping: false,
              maximum_cost_allowed: 100,
            },
            discount_category: 'coupon',
            target_type: '',
            type: '',
          },
        ],
        shipping_address: {
          identification: countryData.shipping_address.identity_document,
          id: 0,
          user_id: '',
          first_name: 'qa test',
          last_name: 'automation',
          phone: countryData.shipping_address.phone,
          identity_document: countryData.shipping_address.identity_document,
          lat: countryData.shipping_address.lat,
          lng: countryData.shipping_address.lng,
          address1: 'test address',
          address2: shipping_address2 ?? '',
          city: countryData.shipping_address.city,
          zipcode: countryData.shipping_address.zipcode,
          state_name: countryData.shipping_address.state_name,
          country: countryData.billing_address.country,
          country_code: countryData.shipping_address.country_code,
          additional_description: '',
          address_type: '',
          is_default: false,
          created_at: '0001-01-01T00:00:00Z',
          updated_at: '0001-01-01T00:00:00Z',
          email: user_email,
        },
        billing_address: {
          identification: billing_identity_document ?? '050623568956124',
          id: 0,
          user_id: '',
          first_name: billing_first_name,
          last_name: billing_last_name,
          phone: billing_phone ?? countryData.billing_address.phone,
          identity_document: billing_identity_document ?? countryData.billing_address.identity_document,
          lat: countryData.shipping_address.lat,
          lng: countryData.shipping_address.lng,
          address1: billing_address1 ?? countryData.billing_address.address1,
          address2: billing_address2 ?? countryData.billing_address.address2,
          city: billing_city ?? countryData.billing_address.city,
          zipcode: billing_zipcode ?? countryData.billing_address.zipcode,
          state_name: billing_state_name ?? countryData.billing_address.state_name,
          country: countryData.billing_address.country,
          country_code: countryData.billing_address.country_code,
          additional_description: 'Descripción adicional',
          address_type: 'home',
          is_default: false,
          created_at: '2021-11-03T22:09:09.086990957Z',
          updated_at: '2021-11-03T22:09:09.087014623Z',
          email: user_email,
        },
        shipping_options: {
          type: 'pickup',
          details: {
            store_name: 'Store Name',
            address: '6 Rotermanni 11343 Talinn',
            address_coordinates: {
              lat: 4.721245,
              lng: -74.04673,
            },
            contact: {
              name: 'jhon snow',
              phone: '9725149104',
            },
            additional_details: {
              pickup_time: '2021-11-03T22:09:09.086990957Z',
              stock_location: '',
            },
          },
        },
        user_instructions: '',
        metadata: {
          key1: 'value1',
          key2: 'value2',
        },
        ...(market_type !== undefined && { market_type }),
        status: 'pending',
        payment: {},
        gift_card: [],
        redirect_url: '',
        webhook_urls: null,
        total_discount: discount_amount,
        display_total_discount: `${countryData.currency} 0.00`,
        shipping: {
          original_amount: 0,
          total_discount: 0,
          discounts: [],
        },
        cash_change: 0,
        shipping_method: {
          code: '',
          name: '',
          min_delivery_date: '',
          max_delivery_date: '',
          cost: 0,
          display_cost: '',
          tax_amount: 0,
          display_tax_amount: '',
          scheduler: [],
        },
        shipping_methods: [],
        timezone: 'America/Mexico_City',
        ...(expires_at !== undefined && { expires_at }),
        scheduled_at: '',
        payment_link: '',
        display_shipping_tax_amount: `${countryData.currency} 0.00`,
        display_total_tax_amount: `${countryData.currency} 0.00`,
        shipping_tax_amount: 0,
        total_tax_amount: 0,
      },
    };
  }
}
