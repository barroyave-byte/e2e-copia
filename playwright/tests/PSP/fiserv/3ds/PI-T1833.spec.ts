import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test } from '@support/fixtures';
import * as crypto from 'crypto';
import { expect } from '@support/fixtures';

const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order_type: 'AIRLINE_ORDER',
  payer_info: {
    email: 'john_doe@email.com',
  },
  payment_source: {
    card_info: {
      expiry_month: '12',
      expiry_year: '29',
      card_number: '5165850000000008',
      card_holder: 'John Doe',
      card_holder_dni: '1234567891',
      zip: '12345',
      city: 'Ibarra',
      address1: 'Avenida Mariano Acosta & Obispo Alejandro Pasquel Monge, Ibarra, Ecuador',
      state: 'New York',
      phone: '+59123456789',
      country: 'AR',
      card_cvv: '123',
      secure_authentication: {
        cavv: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        xid: '5a56fdc9-6d47-5fee-8000-000000296743',
        three_ds_authentication_response: 'Y',
      },
    },
    method_type: 'credit_card',
  },
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'ARS',
    items_total_amount: 2175,
    tax_amount: 0,
    sub_total: 2175,
    shipping_amount: 100,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 65,
    total_amount: 2240,
    shipping_methods: [
      {
        code: '12345JR',
        name: 'entregas Speed',
        cost: 250,
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
          currency: 'ARS',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 1050,
          currency: 'ARS',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'ARS',
          currency_symbol: '$',
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
          currency: 'ARS',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 75,
          currency: 'ARS',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15,
          currency: 'ARS',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],
    billing_address: {
      id: 222,
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'jroldan@deuna.com',
      address1: 'La Ballena',
      address2: 'Capilla virgen del valle',
      zipcode: '7521',
      city: 'Buenos Aires',
      state_name: 'Buenos Aires',
      country_code: 'ARG',
      identity_document: '74857601',
      identity_document_type: 'DNI',
      phone: '+5521987654321',
      lat: -23.555425,
      lng: -46.677048,
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
      'Tarifa de envio': '',
    },
  },
  airline_information: {
    bookingItems: [
      {
        pnr: 'KFA123',
        ticket_number: 'ABC123',
        e_ticket: true,
        ticketing_travel_agency: {
          iata_code: 'ABC123',
          name: 'Kushki',
        },
        passenger: {
          user_id: '{{$randomUUID}}',
          first_name: 'Elon',
          middle_name: 'Michael',
          last_name: 'Gates',
          document_type: 'DNI',
          document: 123456789,
          email: 'guangmian@gmail.com',
          phone: '+6591522381',
          frequent_flyer_code: 'ABC123',
          title: 'Mr',
        },
        legs: [
          {
            origin: {
              iata_code: 'LHR',
              date: '2024-01-01',
              time: '18:00',
            },
            destination: {
              iata_code: 'LHR',
              date: '2024-01-01',
              time: '18:00',
            },
            carrier_code: 'ABC123',
            carrier_name: 'latam Airlines',
            flight_number: 'ABC123',
            seat_location: '3C',
            fare_basis_code: 'ABC123',
          },
        ],
      },
    ],
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.fiservProcessor3DSMPIAR,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T1833 (1.0) 3DS MPI con estatus Y con Fiserv para AR',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-3653' },
    },
    async ({ page, paymentService }) => {
      userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

      const purchase_v2 = (
        await paymentService.purchaseV2(privateKey, userAuthToken, payloadOrder as any)
      ).data as any;

      const order_token = purchase_v2?.order_token ?? purchase_v2?.order?.order_token;
      expect(order_token).not.toBeUndefined();

      const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, order_token);
      const data = resultGetOrder.orderPayment.data;
      expect(data).not.toBeUndefined();
      expect(data).not.toBeNull();
      expect(data.secure_authentication).not.toBeUndefined();
      expect(data.secure_authentication).not.toBeNull();
      expect(data.secure_authentication.cavv).toEqual('AAAAAAAAAAAAAAAAAAAAAAAAAAA=');
      expect(data.secure_authentication.xid).toEqual('5a56fdc9-6d47-5fee-8000-000000296743');
      expect(data.status).toEqual('processed');
    }
  );
});
