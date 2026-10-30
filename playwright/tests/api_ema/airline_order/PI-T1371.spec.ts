import { expect, test } from '@support/fixtures';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as crypto from 'crypto';

const order_id = crypto.randomUUID();

const body_sent = {
  order_type: 'AIRLINE_ORDER',
  order: {
    payer_info: {
      email: 'audrey.hepburn-1720721058131@superstar.com',
    },
    currency: 'MXN',
    shipping_address: {
      is_default: false,
    },
    items: [
      {
        unit_price: {
          currency_symbol: '$',
        },
        tax_amount: {
          currency: 'MXN',
          currency_symbol: '$',
        },
        taxable: false,
        id: 'IT001',
        name: 'Prueba',
        description: 'Description',
        quantity: 1,
      },
    ],
    discounts: [
      {
        free_shipping: {
          is_free_shipping: false,
        },
      },
    ],
    billing_address: {
      country: 'MXN',
      address_type: 'home',
      is_default: false,
    },
    shipping_options: {
      type: 'delivery',
    },
    order_id: order_id,
    timezone: 'America/Mexico_City',
    sub_total: 10000,
    total_amount: 10000,
    total_tax_amount: 0,
    store_code: 'all',
    airline_information: {
      booking_items: [
        {
          pnr: 'ABC123',
          ticket_number: '0123456789123',
          e_ticket: true,
          airline_3_digit_code: '123',
          airline_iata_designator: 'AA',
          ancillaries: [
            {
              type: 'Premium meal',
              ticket_number: '0011234567890',
              total_amount: 3500,
              service_category: 'A',
              description: 'Premium meal',
            },
          ],
          ticketing_travel_agency: {
            iata_code: 'XYZ789',
            name: 'Global Travel Agency',
            agency_invoice_number: 'INV123456',
          },
          passenger: {
            user_id: '123456-abc-7890-def-1234567890',
            first_name: 'John',
            middle_name: 'Michael',
            last_name: 'Doe',
            document_type: 'Passport',
            identity_document_number: 'A123456789',
            document_number: 'A123456789',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            frequent_flyer_code: 'FF12345',
            title: 'Mr',
            type: '',
            date_of_birth: '1980-02-16',
            country_code: '',
          },
          legs: [
            {
              origin: {
                iata_code: 'LHR',
                date: '2024-01-01',
                time: '18:00',
                city: '',
                country_code: 'US',
              },
              destination: {
                iata_code: 'JFK',
                date: '2024-01-01',
                time: '22:00',
                city: '',
                country_code: 'US',
              },
              carrier_code: 'AA',
              carrier_name: 'American Airlines',
              flight_number: 'AA123',
              seat_location: '12A',
              fare_basis_code: 'Y',
              stopover_code: 'NONE',
              service_class: '',
              sub_total_amount: 0,
              tax_amount: 0,
              total_amount: 0,
              airport_tax_amount: 0,
            },
          ],
        },
        {
          pnr: 'DEF456',
          ticket_number: '0123456789124',
          e_ticket: true,
          airline_3_digit_code: '789',
          airline_iata_designator: 'UA',
          ancillaries: [],
          ticketing_travel_agency: {
            iata_code: 'ABC123',
            name: 'Kushki Travel',
            agency_invoice_number: 'INV654321',
          },
          passenger: {
            user_id: 'abcdef-12345-67890-ghijk',
            first_name: 'Jane',
            middle_name: 'Elizabeth',
            last_name: 'Smith',
            document_type: 'DNI',
            identity_document_number: 'B987654321',
            document_number: 'B987654321',
            email: 'jane.smith@example.com',
            phone: '+0987654321',
            frequent_flyer_code: 'FF67890',
            title: 'Mrs',
            type: '',
            date_of_birth: '1990-06-25',
            country_code: '',
          },
          legs: [
            {
              origin: {
                iata_code: 'SFO',
                date: '2024-02-15',
                time: '09:00',
                city: '',
                country_code: '',
              },
              destination: {
                iata_code: 'LAX',
                date: '2024-02-15',
                time: '10:30',
                city: '',
                country_code: '',
              },
              airport_tax_amount: 0,
              carrier_code: 'UA',
              carrier_name: 'United Airlines',
              flight_number: 'UA456',
              seat_location: '14B',
              fare_basis_code: 'Z',
              stopover_code: 'NONE',
              service_class: '',
              sub_total_amount: 0,
              tax_amount: 0,
              total_amount: 0,
            },
          ],
        },
      ],
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PI-T1371 Create Order Type AIRLINE_ORDER',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent as unknown as TokenizeOrderRequestData
        );
        const orderToken = tokenizeResponse.data.token;
        expect(orderToken).not.toBeUndefined();

        const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
        expect(getOrderResponse.status).toBe(200);

        expect(tokenizeResponse.data.order_type).toBe('AIRLINE_ORDER');

        const order = getOrderResponse.data.order;
        expect(order.airline_information).toBeDefined();
        expect(order.airline_information.booking_items).toHaveLength(2);

        // convert total_amount from string to number.
        // total_amount is originally in int64 format but protobuf's JSON marshaller returns int64 attrs as string
        const bookingItem0 = {
          ...order.airline_information.booking_items[0],
          ancillaries:
            order.airline_information.booking_items[0].ancillaries?.map((ancillary) => ({
              ...ancillary,
              total_amount: Number(ancillary.total_amount),
            })) || [],
        };
        expect(bookingItem0).toMatchObject(body_sent.order.airline_information.booking_items[0]);
        expect(order.airline_information.booking_items[1]).toMatchObject(
          body_sent.order.airline_information.booking_items[1]
        );
      });
    }
  );
});
