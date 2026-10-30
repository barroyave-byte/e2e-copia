import { EmailGenerator } from '@support/utils/EmailGenerator';
import { COUNTRY_DATA } from './countryData';
import { TokenizeOrderRequestData } from '@support/http/models/order';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { faker } from '@faker-js/faker';

const COUNTRY_DEFAULTS: Record<
  CountryCodes,
  { currency: string; country_code: string; currency_symbol: string }
> = {
  CO: { currency: 'COP', country_code: 'CO', currency_symbol: '$' },
  MX: { currency: 'MXN', country_code: 'MX', currency_symbol: '$' },
  BR: { currency: 'BRL', country_code: 'BRA', currency_symbol: 'R$' },
  CL: { currency: 'CLP', country_code: 'CL', currency_symbol: '$' },
  EC: { currency: 'USD', country_code: 'EC', currency_symbol: '$' },
  GT: { currency: 'GTQ', country_code: 'GT', currency_symbol: 'Q' },
  CR: { currency: 'CRC', country_code: 'CR', currency_symbol: '₡' },
  US: { currency: 'USD', country_code: 'US', currency_symbol: '$' },
  HN: { currency: 'HNL', country_code: 'HN', currency_symbol: 'L' },
  PE: { currency: 'PEN', country_code: 'PE', currency_symbol: 'S/' },
  AR: { currency: 'ARS', country_code: 'AR', currency_symbol: '$' },
  UY: { currency: 'UYU', country_code: 'UY', currency_symbol: '$' },
  ES: { currency: 'EUR', country_code: 'ES', currency_symbol: '€' },
};

/**
 * Options for customizing DEUNA PAYMENT_LINK order
 */
export interface DeunaPaymentLinkOrderOptions {
  order_id?: string;
  store_code?: string;
  user_email?: string;
  amount?: number;
  phone?: string;
  checkout_modules?: any;
}

/**
 * Params for building a custom PAYMENT_LINK body.
 */
export interface PaymentLinkBodyParams {
  /** When provided, sets currency, country_code and currency_symbol automatically. Can still be overridden individually. */
  country?: CountryCodes;
  order_id?: string;
  amount?: number;
  currency?: string;
  currency_symbol?: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  identity_document_type?: string;
  identity_document?: string;
  phone?: string;
  address?: string;
  city?: string;
  state_name?: string;
  country_code?: string;
  zipcode?: string;
  store_code?: string;
  checkout_modules?: {
    name: string;
    props?: {
      fields?: { name: string; [key: string]: any }[];
      [key: string]: any;
    };
    [key: string]: any;
  }[];
  discount_amount?: number;
  discount_code?: string;
  webhook_notify_order?: string;
}

export class DeunaPaymentLinkOrderBuilder {
  static createOrder(
    country: CountryCodes,
    options: DeunaPaymentLinkOrderOptions = {}
  ): TokenizeOrderRequestData {
    const countryData = COUNTRY_DATA[country];

    if (!countryData) {
      throw new Error(`Unsupported country code: ${country}`);
    }

    const {
      order_id = `${crypto.randomUUID()}`,
      store_code = 'all',
      user_email = `${faker.internet.email({ firstName: `${crypto.randomUUID()}` })}`,
      amount,
      phone,
      checkout_modules = [],
    } = options;

    // Use custom amount if provided, otherwise use countryData values
    const finalAmount = amount ?? countryData.total_amount;
    const displayAmount = `${countryData.currency} ${(finalAmount / 100).toFixed(2)}`;
    // Use custom phone if provided, otherwise use countryData values
    const finalPhone = phone ?? countryData.shipping_address.phone;

    return {
      order_type: 'PAYMENT_LINK',
      order: {
        order_id,
        store_code,
        currency: countryData.currency,
        tax_amount: finalAmount,
        shipping_amount: finalAmount,
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
          phone: finalPhone,
          identity_document: countryData.shipping_address.identity_document,
          lat: countryData.shipping_address.lat,
          lng: countryData.shipping_address.lng,
          address1: 'test address',
          address2: '',
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
          identification: '050623568956124',
          id: 0,
          user_id: '',
          first_name: 'NELSON',
          last_name: 'JIMENEZ',
          phone: finalPhone,
          identity_document: countryData.billing_address.identity_document,
          lat: countryData.shipping_address.lat,
          lng: countryData.shipping_address.lng,
          address1: countryData.billing_address.address1,
          address2: countryData.billing_address.address2,
          city: countryData.billing_address.city,
          zipcode: countryData.billing_address.zipcode,
          state_name: countryData.billing_address.state_name,
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
        status: 'pending',
        payment: {},
        gift_card: [],
        redirect_url: '',
        webhook_urls: null,
        total_discount: 0,
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
        scheduled_at: '',
        payment_link: '',
        display_shipping_tax_amount: `${countryData.currency} 0.00`,
        display_total_tax_amount: `${countryData.currency} 0.00`,
        shipping_tax_amount: 0,
        total_tax_amount: 0,
      },
      checkout_modules: checkout_modules,
    };
  }

  /**
   * Builds a PAYMENT_LINK body
   * All params are optional
   * Use this to get a ready-to-send body and override only what your test case needs.
   *
   * @example
   * const body = DeunaPaymentLinkOrderBuilder.createBody({ amount: 500000, user_email: 'custom@test.com' });
   * await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(undefined, body);
   */
  static createBody(params: PaymentLinkBodyParams = {}): TokenizeOrderRequestData {
    const countryDefaults = params.country
      ? COUNTRY_DEFAULTS[params.country]
      : COUNTRY_DEFAULTS['MX'];
    const {
      order_id = crypto.randomUUID(),
      amount = 250000,
      currency = countryDefaults.currency,
      currency_symbol = countryDefaults.currency_symbol,
      user_email = params.user_email ?? EmailGenerator.generatePayerEmail(),
      first_name = 'John',
      last_name = 'Doe',
      identity_document_type = 'CC',
      identity_document = '1234567890',
      phone = '0987654321',
      address = '',
      city = 'San Ángel',
      state_name = 'Mexico City',
      country_code = countryDefaults.country_code,
      zipcode = '01000',
      store_code = 'all',
      checkout_modules = [{ name: 'LoginPattern' }, { name: 'OrderDetailPattern' }],
      discount_amount = 1200,
      discount_code = 'CuponPrueba',
      webhook_notify_order = 'https://webhook.site/54a29453-05fd-4875-a861-08071421a609',
    } = params;

    const addressFields = {
      first_name,
      last_name,
      email: user_email,
      address1: address,
      zipcode,
      city,
      state_name,
      country_code,
      identity_document,
      identity_document_type,
      phone,
      lat: -41.743,
      lng: 11.987,
      address_type: 'home',
      identification: identity_document,
      id: 0,
      user_id: '',
      address2: '',
    };

    return {
      order_type: 'PAYMENT_LINK',
      checkout_modules,
      order: {
        order_id,
        store_code,
        currency,
        items_total_amount: amount,
        sub_total: amount,
        total_amount: amount,
        payer_info: { email: user_email },
        redirect_urls: {},
        billing_address: addressFields,
        shipping_address: addressFields,
        discounts: [
          {
            amount: discount_amount,
            code: discount_code,
            discount_category: 'coupon',
            display_amount: '',
            reference: '',
            description: '',
            details_url: '',
            free_shipping: { is_free_shipping: false, maximum_cost_allowed: 0 },
          },
        ],
        items: [
          {
            id: '79',
            name: 'Juegos de la Muerte',
            description: 'Juegos de la muerte - Mitikah - 10/01/2024 22:10',
            options: '',
            total_amount: {
              amount,
              currency,
              currency_symbol,
              original_amount: 0,
              display_amount: '',
              display_original_amount: '',
              total_discount: 0,
              display_total_discount: '',
            },
            unit_price: {
              amount,
              currency,
              currency_symbol,
              display_amount: '',
            },
            tax_amount: { amount: 0, display_amount: '' },
            quantity: 1,
            upc: 'string',
            sku: 'SKU-11021',
            brand: 'Bolt Swagstore',
            category: 'tickets',
            image_url: 'https://statics.cinemex.com/movie_posters/7uUQHyJhhUtmQlq-360x540.jpg',
            uom: '',
            isbn: '',
            manufacturer: '',
            color: '',
            size: '',
            weight: { weight: 0, unit: '' },
            details_url: '',
            type: 'physical',
            taxable: false,
            discounts: [],
            included_in_subscription: false,
          },
        ],
        webhook_urls: { notify_order: webhook_notify_order },
      },
    };
  }

  static createBodyFromCommerce(params: PaymentLinkBodyParams = {}): TokenizeOrderRequestData {
    const {
      order_id = crypto.randomUUID(),
      amount = 250000,
      user_email = EmailGenerator.generatePayerEmail(),
      store_code = 'all',
      discount_amount = 1200,
      discount_code = 'CuponPrueba',
      webhook_notify_order = 'https://webhook.site/54a29453-05fd-4875-a861-08071421a609',
      currency = 'MXN',
    } = params;

    return {
      order_type: 'PAYMENT_LINK',
      order: {
        order_id: order_id,
        currency: currency,
        items_total_amount: amount,
        sub_total: amount,
        total_amount: amount,
        store_code: store_code,
        redirect_urls: {
          close: 'https://www.google.com?q=close',
          success: 'https://www.google.com?q=success',
          pending: 'https://www.google.com?q=pending',
          error: 'https://www.google.com?q=failure',
          fallback: 'https://www.google.com?q=fallback',
        },
        billing_address: {
          email: user_email,
        },
        metadata: {
          key: 'value',
        },
        discounts: [
          {
            amount: discount_amount,
            code: discount_code,
            discount_category: 'coupon',
          },
        ],
        items: [
          {
            id: '79',
            name: 'Juegos de la Muerte',
            description: 'Juegos de la muerte - Mitikah - 10/01/2024 22:10',
            total_amount: {
              amount: amount,
              currency: params.currency,
            },
            unit_price: {
              amount: amount,
              currency: params.currency,
            },
            quantity: 1,
          },
        ],
        webhook_urls: {
          notify_order: webhook_notify_order,
        },
      },
    };
  }
}
