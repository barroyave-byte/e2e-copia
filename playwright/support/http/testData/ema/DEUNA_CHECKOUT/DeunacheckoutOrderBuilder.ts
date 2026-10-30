import { EmailGenerator } from '@support/utils/EmailGenerator';
import { TokenizeOrderRequestData } from '@support/http/models/order';
import { CountryCodes } from '@support/interfaces/countryCodeTypes';
import { COUNTRY_DATA } from './countryData';
import { faker } from '@faker-js/faker';

/**
 * Options for customizing DEUNA_CHECKOUT order
 */
export interface DeunacheckoutOrderOptions {
  order_id?: string;
  store_code?: string;
  amount?: number;
  payment_method?: string;
  phone?: string;
  city?: string;
  user_email?: string;
  shipping_rate?: string;
  expires_at?: string;
}

/**
 * Params for building a custom DEUNA_CHECKOUT body.
 */
export interface CheckoutBodyParams {
  order_id?: string;
  store_code?: string;
  amount?: number;
  currency?: string;
  currency_symbol?: string;
  amount_display?: string;
  payment_method?: string | null;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  identity_document?: string;
  identity_document_type?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state_name?: string;
  country_code?: string;
  country?: string;
  zipcode?: string;
  lat?: number;
  lng?: number;
  item_name?: string;
  item_description?: string;
  item_image_url?: string;
  item_sku?: string;
  item_brand?: string;
  item_category?: string;
  checkout_modules?: object[];
  redirect_urls?: {
    close?: string;
    error?: string;
    fallback?: string;
    pending?: string;
    success?: string;
  };
}

/**
 * Builder class for DEUNA_CHECKOUT orders with country-specific data
 */
export class DeunacheckoutOrderBuilder {
  /**
   * Creates a DEUNA_CHECKOUT order body with country-specific modifications
   *
   * @param country - The country code to use for localization
   * @param options - Optional customizations for the order
   * @returns Complete TokenizeOrderRequestData for DEUNA_CHECKOUT
   */
  static createOrder(
    country: CountryCodes,
    options: DeunacheckoutOrderOptions = {}
  ): TokenizeOrderRequestData {
    const countryData = COUNTRY_DATA[country];

    if (!countryData) {
      throw new Error(`Unsupported country code: ${country}`);
    }

    const {
      order_id = `${crypto.randomUUID()}`,
      store_code = 'all',
      amount,
      payment_method,
      phone,
      city,
      user_email = `${faker.internet.email({ firstName: `${crypto.randomUUID()}` })}`,
      shipping_rate,
      expires_at,
    } = options;

    // Use custom values if provided, otherwise use countryData defaults
    const finalAmount = amount ?? countryData.total_amount;
    const taxAmount = 200; // 10% tax
    const shippingAmount = 500; // Fixed shipping
    const itemsAmount = finalAmount - taxAmount - shippingAmount;
    const subTotal = itemsAmount + shippingAmount;

    const finalPhone = phone ?? (countryData.shipping_address?.phone || '');
    const finalCity = city ?? (countryData.shipping_address?.city || '');

    // Helper function to format display amounts
    const formatDisplay = (amt: number) => `${countryData.currency} ${(amt / 100).toFixed(2)}`;

    return {
      order_type: 'DEUNA_CHECKOUT',
      order: {
        order_id,
        store_code,
        currency: countryData.currency,
        ...(expires_at && { expires_at }),
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        items_total_amount: itemsAmount,
        sub_total: subTotal,
        total_amount: finalAmount,
        display_total_amount: formatDisplay(finalAmount),
        items: [
          {
            id: '2788',
            name: 'BBQ Crunch',
            description: '',
            options: 'string option',
            total_amount: {
              amount: itemsAmount,
              original_amount: itemsAmount,
              display_amount: formatDisplay(itemsAmount),
              display_original_amount: formatDisplay(itemsAmount),
              currency: countryData.currency,
              currency_symbol: '$',
              total_discount: 0,
              display_total_discount: formatDisplay(0),
            },
            unit_price: {
              amount: itemsAmount,
              display_amount: formatDisplay(itemsAmount),
              currency: countryData.currency,
              currency_symbol: '$',
            },
            tax_amount: {
              amount: 0,
              display_amount: formatDisplay(0),
              currency: countryData.currency,
              currency_symbol: '$',
            },
            quantity: 1,
            uom: 'string',
            upc: 'string',
            sku: '',
            isbn: '',
            brand: '',
            manufacturer: '',
            category: '',
            color: '',
            size: '',
            weight: {
              weight: 0,
              unit: 'kg',
            },
            image_url:
              'https://images-staging.getduna.com/6d5d0c8f-7ffe-4f5f-bb28-24f09dab4b47/a5c353469a0ff987_domicilio_2788_720x720_1660826634.png?d=200x200&format=webp',
            details_url: '',
            type: 'physcal',
            taxable: true,
            discounts: [],
            included_in_subscription: false,
          },
        ],
        discounts: [],
        shipping_options: {
          type: 'delivery',
          details: {} as any,
        },
        user_instructions: '',
        metadata: {
          origin: 'core',
        },
        status: 'pending',
        payment: payment_method ? { method: payment_method } : {},
        gift_card: [],
        redirect_url: '',
        webhook_urls: countryData.webhook_urls
          ? {
              apply_coupon: countryData.webhook_urls.apply_coupon,
              shipping_rate: shipping_rate ?? countryData.webhook_urls.shipping_rate,
            }
          : null,
        total_discount: 0,
        display_total_discount: formatDisplay(0),
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
        shipping_methods: [
          {
            code: 'delivery',
            name: 'delivery',
            min_delivery_date: '',
            max_delivery_date: '',
            cost: shippingAmount,
            display_cost: formatDisplay(shippingAmount),
            tax_amount: 0,
            display_tax_amount: '',
            scheduler: [],
          },
        ],
        timezone: '',
        scheduled_at: '',
        shipping_address: {
          identification: '',
          id: 0,
          user_id: '',
          first_name: 'QA TEST',
          last_name: 'AUTOMATION',
          phone: finalPhone,
          identity_document: '',
          lat: 0,
          lng: 0,
          address1: '',
          address2: '',
          city: '',
          zipcode: '',
          state_name: '',
          country: '',
          country_code: '',
          additional_description: '',
          address_type: 'home',
          is_default: false,
          created_at: '0001-01-01T00:00:00Z',
          updated_at: '0001-01-01T00:00:00Z',
          email: user_email,
        },
        billing_address: {
          identification: '050623568956124',
          id: 0,
          user_id: '',
          first_name: 'QA TEST',
          last_name: 'AUTOMATION',
          phone: countryData.billing_address.phone,
          identity_document: countryData.billing_address.identity_document,
          lat: countryData.billing_address.lat,
          lng: countryData.billing_address.lng,
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
        payment_link: '',
        display_shipping_tax_amount: formatDisplay(0),
        display_total_tax_amount: formatDisplay(taxAmount),
        shipping_tax_amount: 0,
        total_tax_amount: taxAmount,
      },
    };
  }

  /**
   * Builds a DEUNA_CHECKOUT body using the Event Ticket item structure.
   * Country-specific defaults (currency, city, addresses) are loaded from COUNTRY_DATA.
   * All params are optional — override only what your test case needs.
   *
   * @example
   * const body = DeunacheckoutOrderBuilder.createBody('MX', { amount: 7980000, payment_method: 'wallet' });
   * await emaService.tokenizeOrderWithCustomBody(privateKey, body);
   */
  static createBody(
    country: CountryCodes = 'MX',
    params: CheckoutBodyParams = {}
  ): TokenizeOrderRequestData {
    const countryData = COUNTRY_DATA[country];

    if (!countryData) {
      throw new Error(`Unsupported country code: ${country}`);
    }

    const billingAddress = countryData.billing_address;

    const {
      order_id = `payment_widget-${Math.floor(Math.random() * 100000000)}`,
      store_code = 'all',
      amount = countryData.default_amount,
      currency = countryData.currency,
      currency_symbol = countryData.currency_symbol,
      amount_display = `${countryData.currency_symbol} ${(amount / 100).toFixed(2)}`,
      payment_method = 'wallet', // pass null to omit from the body
      user_email = EmailGenerator.generatePayerEmail(),
      first_name = 'John',
      last_name = 'Doe',
      phone = billingAddress.phone,
      identity_document = billingAddress.identity_document,
      identity_document_type = 'RFC',
      address1 = billingAddress.address1,
      address2 = billingAddress.address2,
      city = billingAddress.city,
      state_name = billingAddress.state_name,
      country_code = billingAddress.country_code,
      country: countryDisplay = countryData.country_display_name,
      zipcode = billingAddress.zipcode,
      lat = billingAddress.lat,
      lng = billingAddress.lng,
      item_name = 'Event Ticket',
      item_description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
      item_image_url = 'https://cdn.stg.deuna.io/explore-deuna/assets/ticketevent.png',
      item_sku = 'EVENT001',
      item_brand = 'Eventos Inc.',
      item_category = 'Eventos',
      checkout_modules,
      redirect_urls,
    } = params;

    const resolvedDisplay =
      amount_display === `$ ${(amount / 100).toFixed(2)}`
        ? `$ ${(amount / 100).toFixed(2)}`
        : amount_display;

    const addressFields = {
      first_name,
      last_name,
      phone,
      identity_document,
      identity_document_type,
      lat,
      lng,
      address1,
      address2,
      city,
      zipcode,
      state_name,
      country_code,
      address_type: 'home',
      email: user_email,
      country: countryDisplay,
    };

    return {
      order_type: 'DEUNA_CHECKOUT',
      ...(checkout_modules && { checkout_modules }),
      order: {
        order_id,
        store_code,
        currency,
        items_total_amount: amount,
        display_items_total_amount: resolvedDisplay,
        sub_total: amount,
        display_sub_total: resolvedDisplay,
        total_amount: amount,
        display_total_amount: resolvedDisplay,
        ...(payment_method != null && { payment_method }),
        items: [
          {
            id: '789012345',
            name: item_name,
            description: item_description,
            options: 'string option',
            price: amount,
            displayPrice: resolvedDisplay,
            productTitle: item_name,
            slug: item_sku.toLowerCase(),
            brand: item_brand,
            category: item_category,
            collections: [],
            color: 'None',
            sku: item_sku,
            taxable: true,
            total_amount: {
              amount,
              original_amount: amount,
              currency,
              currency_symbol,
              display_amount: resolvedDisplay,
              display_original_amount: resolvedDisplay,
            },
            type: 'Evento',
            unit_price: {
              original_amount: amount,
              amount,
              currency,
              currency_symbol,
              display_original_amount: resolvedDisplay,
              display_amount: resolvedDisplay,
            },
            uom: 'Entrada',
            upc: 'string',
            weight: { weight: 1, unit: 'kg' },
            quantity: 1,
          } as any,
        ],
        ...(redirect_urls && { redirect_urls }),
        shipping_address: addressFields,
        billing_address: addressFields,
        shipping_options: {
          type: 'delivery',
          details: {} as any,
        },
        user_instructions: 'This item is a gift.',
      },
    } as unknown as TokenizeOrderRequestData;
  }
}
