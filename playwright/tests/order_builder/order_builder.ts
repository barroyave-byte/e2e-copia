import {
  MethodType,
  PurchaseRequestV2,
  PlayerInfo,
  PaymentSource,
  BrowserDetails,
} from '@support/http/models/payment';
import { getSymbol, OrderCurrency, OrderType } from './enums';
import type { OrderConfig } from './interface';
import { generatePNR, generateTicketNumber } from './order_functions';
import { EmailGenerator } from '@support/utils/EmailGenerator';

export { OrderCurrency, OrderType };
export type { OrderConfig };

export function OrderBuilder(config: OrderConfig): any {
  const order_id = crypto.randomUUID();
  const email = EmailGenerator.generateRegisteredUserEmail();

  const method_type = config.method_type || MethodType.CREDIT_CARD;

  if (
    (config.method_type == MethodType.CREDIT_CARD && !config.creditCard && !config.cardId) ||
    (config.creditCard && config.cardId)
  ) {
    throw new Error('Either creditCard or cardId must be provided');
  }

  let card_info = {};
  if (config.creditCard) {
    const expiration_date = config.creditCard.expiration_date;
    if (expiration_date.length !== 4) {
      throw new Error('Invalid expiration date format. Expected format is MMYY');
    }
    const expiry_month = expiration_date.substring(0, 2);
    const expiry_year = `20${expiration_date.substring(2, 4)}`;
    card_info = {
      expiry_month: expiry_month,
      expiry_year: expiry_year,
      card_holder: config.creditCard.cardholder_name,
      card_holder_dni: config.creditCard.document_number,
      card_number: config.creditCard.number,
    };
  }

  if (config.cardId) {
    card_info = {
      card_id: config.cardId,
    };
  }

  const body_purchase_v2 = {
    order_type: config.order_type,
    payer_info: {
      email: email,
    },
    payment_source: {
      method_type: method_type,
      card_info: card_info,
    },
    anti_fraud_info: {
      ip_address: '192.1.1.0.0',
      user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.29 Safari/537.36',
      browser_details: {
        screen_height: 1000,
        screen_width: 2000,
      },
    },
    order_token: undefined,
    order: {
      order_id: order_id,
      store_code: 'all',
      currency: config.order_currency,
      total_discount: 500,
      shipping_amount: 2500,
      sub_total: 12000,
      total_tax_amount: 1000,
      total_amount: 13000,
      shipping_methods: [
        {
          code: '12345JR',
          name: 'Fast Delivery',
          cost: 2500,
        },
      ],
      discounts: [],
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Papas',
          description: 'Papas fritas con paprica',
          total_amount: {
            original_amount: 2100,
            amount: 2050,
            total_discount: 100,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          unit_price: {
            amount: 1050,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          tax_amount: {
            amount: 50,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          quantity: 2,
          image_url:
            'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
          taxable: true,
        },
        {
          id: crypto.randomUUID(),
          name: 'Refresco',
          description: 'Coca-cola Sprite',
          total_amount: {
            original_amount: 75,
            amount: 90,
            total_discount: 0,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          unit_price: {
            amount: 75,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          tax_amount: {
            amount: 15,
            currency: config.order_currency,
            currency_symbol: getSymbol(config.order_currency),
          },
          quantity: 1,
          image_url:
            'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
          taxable: true,
        },
      ],
      shipping_address: {
        id: 111,
        first_name: 'Pablo',
        last_name: 'Murillo',
        email: EmailGenerator.generateRegisteredUserEmail(),
        address1: 'Av. Primavera',
        address2: 'Edificio Santa Rosa',
        zipcode: '15023',
        city: 'Lima',
        state_name: 'Lima',
        country_code: config.country_code ?? 'Peru',
        identity_document: '12345678901',
        identity_document_type: 'DNI',
        phone: '+51987654321',
        lat: -12.0563,
        lng: -76.9358,
        additional_description: 'Descripción adicional',
        address_type: 'home',
      },
      billing_address: {
        id: 222,
        first_name: 'Jean',
        last_name: 'Roldan',
        email: EmailGenerator.generateRegisteredUserEmail(),
        address1: 'Calle Los Sauces',
        address2: 'Residencial Los Olivos',
        zipcode: '07006',
        city: 'Callao',
        state_name: 'Callao',
        country_code: config.country_code ?? 'Peru',
        identity_document: '74857601',
        identity_document_type: 'DNI',
        phone: '+51987654321',
        lat: -12.06502,
        lng: -76.98295,
        address_type: 'home',
      },
      user_instructions: 'User instructions',
      metadata: {
        origin: 'core',
      },
      browser_details: {
        screen_height: 1000,
        screen_width: 2000,
      },
      webhook_urls: {
        notify_order: '',
        apply_coupon: '',
        remove_coupon: '',
        get_shipping_methods: '',
        update_shipping_method: '',
        tarifa_de_envio: '',
      },
      airline_information: {
        bookingItems: [
          {
            pnr: `${generatePNR()}`,
            ticket_number: `${generateTicketNumber(10)}`,
            e_ticket: true,
            ticketing_travel_agency: {
              iata_code: 'SEA',
              name: 'Expedia',
            },
            passenger: {
              user_id: `${crypto.randomUUID()}`,
              first_name: 'Gustavo',
              middle_name: 'Eduardo',
              last_name: 'Mena',
              document_type: 'DNI',
              identity_document_number: '07277747',
              email: 'gmena@deuna.com',
              phone: '+14155688537',
              frequent_flyer_code: '51434591833',
              title: 'Mr',
              date_of_birth: '1985-12-31',
              country_code: config.country_code ?? 'PE',
            },
            legs: [
              {
                origin: {
                  iata_code: 'SEA',
                  date: '2024-02-01',
                  time: '12:00',
                },
                destination: {
                  iata_code: 'LAX',
                  date: '2024-02-01',
                  time: '18:00',
                },
                carrier_code: 'Y4',
                carrier_name: 'Volaris',
                flight_number: 'VO899',
                seat_location: '3C',
                fare_basis_code: 'J',
                stopover_code: '',
                sub_total_amount: 2500,
                tax_amount: 250,
                total_amount: 2750,
              },
              {
                origin: {
                  iata_code: 'LAX',
                  date: '2024-02-01',
                  time: '23:00',
                },
                destination: {
                  iata_code: 'SEA',
                  date: '2024-02-02',
                  time: '07:00',
                },
                carrier_code: 'Y4',
                carrier_name: 'Volaris',
                flight_number: 'VO489',
                seat_location: '4C',
                fare_basis_code: 'J',
                stopover_code: '',
                sub_total_amount: 2500,
                tax_amount: 250,
                total_amount: 2750,
              },
            ],
          },
          {
            pnr: `${generatePNR()}`,
            ticket_number: '{{uatp_ticket_number}}',
            e_ticket: true,
            ticketing_travel_agency: {
              iata_code: 'TRA123',
              name: 'Expedia',
            },
            passenger: {
              user_id: `${crypto.randomUUID()}`,
              first_name: 'Lourdes',
              middle_name: 'Daniela',
              last_name: 'Montenegro',
              document_type: 'DNI',
              identity_document_number: '70326536',
              email: 'lmontenegro@deuna.com',
              phone: '+14155797662',
              frequent_flyer_code: '51703265363',
              title: 'Ms',
              date_of_birth: '1989-04-21',
              country_code: config.country_code ?? 'PE',
            },
            legs: [
              {
                origin: {
                  iata_code: 'SEA',
                  date: '2024-02-01',
                  time: '12:00',
                },
                destination: {
                  iata_code: 'LAX',
                  date: '2024-02-01',
                  time: '18:00',
                },
                carrier_code: 'Y4',
                carrier_name: 'Volaris',
                flight_number: 'VO899',
                seat_location: '3C',
                fare_basis_code: 'J',
                stopover_code: '',
                sub_total_amount: 2500,
                tax_amount: 250,
                total_amount: 2750,
              },
              {
                origin: {
                  iata_code: 'LAX',
                  date: '2024-02-01',
                  time: '23:00',
                },
                destination: {
                  iata_code: 'SEA',
                  date: '2024-02-02',
                  time: '07:00',
                },
                carrier_code: 'Y4',
                carrier_name: 'Volaris',
                flight_number: 'VO489',
                seat_location: '4C',
                fare_basis_code: 'J',
                stopover_code: '',
                sub_total_amount: 2500,
                tax_amount: 250,
                total_amount: 2750,
              },
            ],
          },
        ],
      },
    },
  };

  if (config.order_token != null) {
    body_purchase_v2.order = undefined;
    body_purchase_v2.order_token = config.order_token;
  }

  if (config.removeCardInfo === true) {
    body_purchase_v2.payment_source.card_info = undefined;
  }

  return body_purchase_v2;
}

export function PurchaseRequestBuilderV2(config: OrderConfig): PurchaseRequestV2 {
  var request: PurchaseRequestV2 = {
    order_token: config.order_token,
    payer_info: { email: config.email } as PlayerInfo,
    payment_source: {
      method_type: config.method_type,
    } as PaymentSource,
    anti_fraud_info: {
      ip_address: '192.1.1.0.0',
      user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.29 Safari/537.36',
      browser_details: {
        screen_height: 1000,
        screen_width: 2000,
      } as BrowserDetails,
    },
  };
  return request;
}
