import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { RiskOption } from '@support/interfaces/riskOption';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { PurchaseResponse } from '@support/http/models/payment';

const configMerchant = new ConfigMerchant();
const giftCardAmount1 = 15000;
const giftCardAmount2 = 34200;
let purchaseResponse: PurchaseResponse;
const purchaseBody = {
  order_type: 'AIRLINE_ORDER',
  payer_info: {
    email: 'test_gus@testuser.com',
    date_of_birth: '1990-08-30T16:00:00.000Z',
  },
  payment_source: {
    method_type: 'credit_card',
    card_info: {
      processor: 'stripe',
      card_number: '4242424242424242',
      card_holder: 'GUSTAVO MENA',
      expiry_month: '08',
      expiry_year: '30',
      card_cvv: '123',
      card_holder_dni: '43459183',
      zip: '11510',
      city: 'Ciudad de Mexico',
      address1: 'Jose Luis Lagrange 103',
      address2: '123, 11º Andar',
      state: 'CDMX',
      phone: '+5511985176644',
      country: 'MX',
    },
    method_type_specific_fields: {
      description: 'descripcion de la orden v2',
    },
  },
  anti_fraud_info: {
    ip_address: '192.1.1.0.0',
    user_agent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.29 Safari/537.36',
    browser_details: {
      screen_height: 1000,
      accept_header: '*/*',
      screen_width: 2000,
    },
    device: {
      id: crypto.randomUUID(),
    },
  },
  order: {
    order_id: crypto.randomUUID(),
    currency: 'MXN',
    items: [
      {
        id: '216',
        name: '10 EMPANADAS',
        description: 'EMPANADAS DE CERDO ASADO',
        options: 'string option',
        total_amount: {
          original_amount: 10000,
          amount: 10000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 10000,
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
        sku: '',
        isbn: '',
        brand: '',
        manufacturer: '',
        category: '',
        color: '',
        size: '',
        weight: {
          amount: 0,
          unit: 'kg',
        },
        image_url: '',
        details_url: '',
        type: 'physical',
        taxable: true,
      },
    ],
    total_discount: 876623,
    gift_card: [
      {
        amount: giftCardAmount1,
      },
      {
        amount: giftCardAmount2,
      },
    ],
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
      email: 'test@mail.com',
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
      email: 'test@mail.com',
      address1: 'Jose Luis Lagrange 103',
      address2: 'Piso 12',
      zipcode: '11510',
      city: 'Ciudad de Mexico',
      state_name: 'Ciudad de Mexico',
      country_code: 'MX',
      identity_document: 'IAOI640911TB8',
      identity_document_type: 'RUT',
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
    airline_information: {
      bookingItems: [
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: crypto.randomUUID(),
            first_name: 'Gustavo',
            middle_name: 'Eduardo',
            date_of_birth: '2000-01-01',
            country_code: 'EC',
            last_name: 'Mena',
            document_type: 'DNI',
            document: '07277747',
            email: 'gmena@deuna.com',
            phone: '+14155688537',
            frequent_flyer_code: '51434591833',
            title: 'Mr',
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
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI899',
              seat_location: '3C',
              fare_basis_code: 'Business',
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'LIM',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI489',
              seat_location: '4C',
              fare_basis_code: 'Business',
            },
          ],
        },
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: crypto.randomUUID(),
            first_name: 'Lourdes',
            middle_name: 'Daniela',
            last_name: 'Montenegro',
            country_code: 'EC',
            date_of_birth: '1987-11-08',
            document_type: 'DNI',
            document: '07277747',
            email: 'lmontenegro@deuna.com',
            phone: '+14155797662',
            frequent_flyer_code: '51703265363',
            title: 'Ms',
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
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI899',
              seat_location: '3C',
              fare_basis_code: 'Business',
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'LIM',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'VOI',
              carrier_name: 'Volaris',
              flight_number: 'VOI489',
              seat_location: '4C',
              fare_basis_code: 'Business',
            },
          ],
        },
      ],
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let privateKey: string;
  let merchantId: string;
  let merchantToken: string;
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    privateKey = merchant.privateKey;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T130 Purchase v2 - Riskified airline data',
    { tag: ['@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page, paymentService }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.riskified,
          processorsConfig.riskifiedProccesor
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      const risk: RiskOption[] = [
        {
          riskLevel: 'low',
          action: 'process',
          processor: {
            name: ConnectionsAvailable.stripeDirect,
            validateCvv: true,
            require3ds: false,
            actionForProcessor: 'decline',
          },
        },
      ];

      // create specific rules for the processor and the risk level defined in the object
      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.riskified, risk);
      });

      await test.step('User makes the payment', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
        purchaseResponse = (
          await paymentService.purchaseV2(privateKey, userAuthToken, purchaseBody as any)
        ).data;
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const purchase_v2 = purchaseResponse;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order_type).toBe('AIRLINE_ORDER');
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual('processed');
      });

      await test.step('It is validated that the order has been fraud reviewed', async () => {
        await paymentDeunaNowPage.assertFraudDecision(
          ConnectionsAvailable.riskified,
          'low',
          'low_risk',
          {
            privateKey: privateKey,
            orderToken: purchaseResponse.order_token,
          }
        );
      });
    }
  );
});
