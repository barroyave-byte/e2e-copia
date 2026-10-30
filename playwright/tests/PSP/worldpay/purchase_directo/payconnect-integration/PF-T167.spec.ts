import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const order_id = crypto.randomUUID();

const purchasePayloadV2 = {
  order_token: '',
  payer_info: {
    email: 'shipping@maxipago.com',
  },
  payment_source: {
    method_type: 'credit_card',
    processor: 'worldpay',
    card_info: {
      expiry_month: '12',
      expiry_year: '2030',
      card_holder: 'Joel Fabian',
      card_holder_dni: '12334568799',
      card_number: '4024007197692931',
      card_cvv: '123',
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zip: '01311000',
      city: 'São Paulo',
      state: 'SP',
      country: 'BR',
      phone: '1122334455',
    },
    method_type_specific_fields: {
      statement_descriptor: 'my order descriptor',
    },
  },
  order: {
    billing_address: {
      first_name: 'Joel',
      last_name: 'Fabian',
      email: 'shipping@maxipago.com',
      identification: '12334568799',
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      phone: '1122334455',
    },
    shipping_address: {
      first_name: 'Joel',
      last_name: 'Fabian',
      email: 'shipping@maxipago.com',
      identification: '12334568799',
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      phone: '1122334455',
    },
  },
  anti_fraud_info: {
    device_id: `${crypto.randomUUID()}`,
    browser_details: {
      accept_header: '*/*',
      user_agent: 'PostmanRuntime/7.42.0',
    },
  },
};
const orderData = {
  order_type: 'AIRLINE_ORDER',
  order: {
    order_id: order_id,
    airline_information: {
      booking_items: [
        {
          airline_3_digit_code: '',
          pnr: '',
          airline_iata_designator: 'AA',
          ancillaries: [],
          e_ticket: false,
          ticket_number: '1234',
          ticketing_travel_agency: {
            agency_invoice_number: '',
            name: 'American Airline',
            iata_code: 'AA',
          },
          passenger: {
            country_code: '',
            date_of_birth: '',
            document_number: '',
            document_type: '',
            email: '',
            frequent_flyer_code: '',
            identity_document_number: '',
            phone: '',
            title: '',
            type: '',
            user_id: 'passenger_code_123',
            first_name: 'Joel',
            middle_name: 'David',
            last_name: 'Fabian',
          },
          legs: [
            {
              carrier_code: 'AA',
              carrier_name: '',
              flight_number: '621',
              origin: {
                city: '',
                country_code: '',
                iata_code: 'SDQ',
                date: '2024-12-21',
                time: '18:33',
              },
              destination: {
                city: '',
                country_code: '',
                date: '',
                iata_code: 'JFK',
                time: '',
              },
              seat_location: '',
              service_class: '',
              stopover_code: '',
              sub_total_amount: 0,
              fare_basis_code: 'VMYA',
              total_amount: 0,
              tax_amount: 120086,
              airport_tax_amount: 1200,
            },
            {
              carrier_code: 'AA',
              carrier_name: '',
              flight_number: '432',
              origin: {
                city: '',
                country_code: '',
                iata_code: 'JFK',
                date: '2024-12-29',
                time: '11:03',
              },
              destination: {
                city: '',
                country_code: '',
                date: '',
                iata_code: 'SDQ',
                time: '',
              },
              seat_location: '',
              service_class: '',
              stopover_code: '',
              sub_total_amount: 0,
              fare_basis_code: 'VMYA',
              total_amount: 0,
              tax_amount: 120087,
              airport_tax_amount: 1200,
            },
          ],
          reservation_system_code: '',
        },
      ],
    },
    store_code: 'all',
    currency: 'COP',
    tax_amount: 3000,
    shipping_amount: 3000,
    total_tax_amount: 1000,
    items_total_amount: 300000,
    sub_total: 3000,
    total_amount: 4000,
    display_total_amount: 'COP 30.00',
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          original_amount: 0,
          display_amount: 'COP 12.00',
          display_original_amount: 'COP 30.00',
          total_discount: 0,
          display_total_discount: 'COP 0.00',
        },
        unit_price: {
          amount: 850,
          display_amount: 'COP 8.50',
        },
        tax_amount: {
          amount: 100,
          display_amount: 'COP 1.00',
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
      id: 0,
      user_id: '',
      first_name: 'qa test',
      last_name: 'automation',
      phone: '+553986100449',
      identity_document: '050105010501',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      country_code: 'BR',
      additional_description: '',
      address_type: '',
      is_default: false,
      created_at: '0001-01-01T00:00:00Z',
      updated_at: '0001-01-01T00:00:00Z',
    },
    billing_address: {
      identification: '050623568956124',
      id: 0,
      user_id: '',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '+553986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Avenida Paulista',
      address2: '123, 11º Andar',
      zipcode: '01311000',
      city: 'São Paulo',
      state_name: 'SP',
      country: 'BR',
      country_code: 'BR',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      email: '{{user_email}}',
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
    display_total_discount: 'COP 0.00',
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
    timezone: 'America/Buenos_Aires',
    scheduled_at: '',
    payment_link: '',
    display_shipping_tax_amount: 'COP 0.00',
    display_total_tax_amount: 'COP 0.00',
    shipping_tax_amount: 0,
  },
};

test.describe('@regression feature to validate purchase with airport tax', () => {
  let userAuthToken: string;
  let orderToken: string;
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let merchantToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    merchantToken = merchant.merchantToken;
    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      orderData as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.worldpayProcessorPayconnect_CO,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T167 Purchase V2 exitoso Airport taxes Worldpay',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_payconnect',
        '@fixme_preprod',
      ],
    },
    async ({ page, paymentService }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('User makes a purchase with Worldpay', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
        purchasePayloadV2.order_token = orderToken;

        await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayloadV2 as any);
      });

      await test.step('It is validated that the order has been processed successfully with status processing', async () => {
        const status = 'processing';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await adminOrderDetailsPage.assertAirlineInformation(
          orderData.order.airline_information,
          privateKey,
          orderToken
        );
      });
    }
  );
});
