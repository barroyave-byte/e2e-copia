import { BaseCreditCard } from '@support/interfaces/credit_cards';
import { generatePNR, generateTicketNumber } from '@tests/order_builder/order_functions';
import { EmailGenerator } from '@support/utils/EmailGenerator';

export function CreateBody(
  creditCard?: BaseCreditCard | Partial<BaseCreditCard>,
  cardId?: string
): any {
  const order_id = crypto.randomUUID();
  const email = EmailGenerator.generateRegisteredUserEmail();

  if ((!creditCard && !cardId) || (creditCard && cardId)) {
    throw new Error('Either creditCard or cardId must be provided');
  }

  let card_info = {};
  if (creditCard) {
    const expiration_date = creditCard.expiration_date;
    if (expiration_date.length !== 4) {
      throw new Error('Invalid expiration date format. Expected format is MM/YYYY');
    }
    const expiry_month = expiration_date.substring(0, 2);
    const expiry_year = `20${expiration_date.substring(2, 4)}`;
    card_info = {
      expiry_month: expiry_month,
      expiry_year: expiry_year,
      card_holder: creditCard.cardholder_name,
      card_holder_dni: creditCard.document_number,
      card_number: creditCard.number,
    };
  }

  if (cardId) {
    card_info = {
      card_id: cardId,
    };
  }

  const body_purchase_v2 = {
    order_type: 'AIRLINE_ORDER',
    payer_info: {
      email: email,
    },
    payment_source: {
      method_type: 'credit_card',
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
    order: {
      order_id: order_id,
      currency: 'MXN',
      items: [
        {
          id: '216',
          name: 'Trip Insurance',
          description: 'Insurance in case of flight delay or cancel',
          options: 'string option',
          total_amount: {
            original_amount: 1000,
            amount: 1000,
            currency: 'MXN',
            currency_symbol: '$',
          },
          unit_price: {
            amount: 1000,
            currency: 'MXN',
            currency_symbol: '$',
          },
          tax_amount: {
            amount: 0,
            currency: 'MXN',
            currency_symbol: '$',
          },
          quantity: 1,
          uom: 'string',
          upc: 'string',
          sku: 'INS45678',
          isbn: '',
          brand: 'Insurance',
          manufacturer: '',
          category: 'Trip Insurance',
          color: '',
          size: '',
          weight: {
            amount: 0,
            unit: 'kg',
          },
          image_url:
            'https://images-staging.getduna.com/95463fb5-6279-4ec3-8ff9-fe07aacd2142/db5b698c57654116_domicilio_216_750x750_1662162887.png?d=200x200&format=webp',
          details_url: '',
          type: 'digital',
          taxable: true,
        },
      ],
      total_discount: 500,
      shipping_amount: 2500,
      sub_total: 12000,
      total_tax_amount: 1000,
      total_amount: 13000,
      store_code: 'all',
      shipping_methods: [
        {
          code: '12345JR',
          name: 'Fast Delivery',
          cost: 2500,
        },
      ],
      shipping_options: {
        type: 'delivery',
      },
      shipping_address: {
        id: '204',
        first_name: 'Juan',
        last_name: 'Silva',
        email: EmailGenerator.generateRegisteredUserEmail(),
        address1: 'Jose Luis Lagrange 103',
        address2: 'Piso 12',
        zipcode: '11510',
        city: 'Ciudad de Mexico',
        state_name: 'Ciudad de Mexico',
        country_code: 'MX',
        identity_document: 'IAOI640911TB8',
        identity_document_type: 'RUT',
        phone: '+5511985176644',
        lat: -22.943934,
        lng: -43.182984,
        additional_description: 'confirmar',
        address_type: 'casa',
      },
      billing_address: {
        id: '179',
        first_name: 'Juan',
        last_name: 'Pacheco',
        email: EmailGenerator.generateRegisteredUserEmail(),
        address1: 'TEST',
        address2: 'Piso 12',
        zipcode: '20005',
        city: 'Ciudad de Mexico',
        state_name: 'Ciudad de Mexico',
        country_code: 'MX',
        identity_document: 'IAOI640911TB8',
        identity_document_type: 'RUT', //RTC or RUT E.g. IAOI640911TB8
        phone: '+5511985176644',
        lat: -23.555425,
        lng: -46.677048,
        address_type: 'casa',
      },
      discounts: [
        {
          amount: 500,
          display_amount: '1000',
          code: 'SUMMER2025',
        },
      ],
      gift_cards: [
        {
          amount: 500,
        },
      ],
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
              country_code: 'PE',
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
              country_code: 'PE',
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

  return body_purchase_v2;
}
