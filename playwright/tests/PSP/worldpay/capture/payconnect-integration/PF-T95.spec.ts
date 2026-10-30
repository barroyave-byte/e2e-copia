import { test } from '@support/fixtures';
import * as crypto from 'crypto';

// Page Objects
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

// Support Utilities
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

// Interfaces and Data
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '@tests/order_validate/validate_transactions';
import { getWorldpayWebhookBody } from '@tests/PSP/worldpay/utils/common';

const configMerchant = new ConfigMerchant();
const order_id = crypto.randomUUID();
const orderData = {
  order_type: 'AIRLINE_ORDER',
  order: {
    order_id: order_id,
    airline_information: {
      booking_items: [
        {
          airline_iata_designator: 'AA',
          ticket_number: '1234',
          ticketing_travel_agency: {
            name: 'American Airline',
            iata_code: 'AA',
          },
          passenger: {
            user_id: 'passenger_code_123',
            first_name: 'Joel',
            middle_name: 'David',
            last_name: 'Fabian',
          },
          legs: [
            {
              carrier_code: 'AA',
              flight_number: '621',
              origin: {
                iata_code: 'SDQ',
                date: '2024-12-21',
                time: '18:33',
              },
              destination: {
                iata_code: 'JFK',
              },
              fare_basis_code: 'VMYA',
              tax_amount: 120086,
            },
            {
              carrier_code: 'AA',
              flight_number: '432',
              origin: {
                iata_code: 'JFK',
                date: '2024-12-29',
                time: '11:03',
              },
              destination: {
                iata_code: 'SDQ',
              },
              fare_basis_code: 'VMYA',
              tax_amount: 120087,
            },
          ],
        },
      ],
    },
    store_code: 'all',
    currency: 'MXN',
    tax_amount: 3000,
    shipping_amount: 3000,
    total_tax_amount: 1000,
    items_total_amount: 300000,
    sub_total: 3000,
    total_amount: 4000,
    display_total_amount: 'MXN 40.00',
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          original_amount: 0,
          display_amount: 'MXN 12.00',
          display_original_amount: 'MXN 30.00',
          total_discount: 0,
          display_total_discount: 'MXN 0.00',
        },
        unit_price: {
          amount: 850,
          display_amount: 'MXN 8.50',
        },
        tax_amount: {
          amount: 100,
          display_amount: 'MXN 1.00',
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
    display_total_discount: 'MXN 0.00',
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
    display_shipping_tax_amount: 'MXN 0.00',
    display_total_tax_amount: 'MXN 0.00',
    shipping_tax_amount: 0,
  },
};
let externalTransactionId = '';
let conciliationId = '';

test.describe('@regression feature to validate with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      orderData as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.worldpayProcessorPayconnectAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T95 Successful total capture Worldpay with Airline Information',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
        '@smoke',
        '@flaky',
        '@admin-preprod',
        '@team_payconnect',
      ],
    },
    async ({ page, paymentService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);

      await test.step('Step 1: Open admin page and set merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('Step 4: Navigate to payment widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        // Worldpay rejects an empty fingerprint: with no fraud provider the widget sends
        // device_id = base64("{}") = "e30=", and Worldpay answers
        // 'Attribute value "e30=" of type NMTOKEN must be a name token'. MercadoPago needs
        // no credentials and is here only to produce a non-empty device_id — the test is
        // about the Worldpay purchase, not about fraud. Bridge until the platform stops
        // forwarding a raw, non-NMTOKEN-safe device_id to Worldpay.
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          antiFraudProviders: { MERCADOPAGO: {} },
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Step 5: Fill credit card information in payment widget', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.worldpayMasterCardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('Step 6: Submit payment to initiate authorization', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Step 7: Verify payment is authorized successfully', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Step 8: Initiate capture process for authorized transaction', async () => {
        await adminOrderDetailsPage.captureTotalOrder();
        const status = 'capturing';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Step 9: Get payment data and validate transaction for webhook', async () => {
        // Get payment data and invoice information
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const invoice = await apiCallNewman.getInvoicePayment(
          paymentData.bodyResponse?.token,
          paymentData.bodyResponse?.order?.order_id
        );

        // Validate transaction for webhook parameters
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );

        // Extract required parameters
        externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
        conciliationId = transaction.conciliation_id;
      });

      await test.step('Step 10: Send webhook and verify final payment status', async () => {
        // Send Worldpay webhook for CAPTURED status
        await paymentService.sendXmlWebhookByProcessorName(
          merchantToken,
          'worldpay',
          getWorldpayWebhookBody(externalTransactionId, 'CAPTURED', conciliationId)
        );

        // Verify final payment status
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status, 10, 5000);
      });

      await test.step('Step 11: Validate airline information is preserved in captured transaction', async () => {
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);

        // Verify that airline information is present and correctly structured
        test.expect(paymentData.airlineInformation).toBeDefined();
        test.expect(paymentData.airlineInformation.booking_items).toBeDefined();
        test.expect(paymentData.airlineInformation.booking_items.length).toBeGreaterThan(0);

        // Validate specific airline data structure
        const bookingItem = paymentData.airlineInformation.booking_items[0];
        test.expect(bookingItem.airline_iata_designator).toBe('AA');
        test.expect(bookingItem.ticket_number).toBe('1234');
        test.expect(bookingItem.legs).toBeDefined();
        test.expect(bookingItem.legs.length).toBe(2);
      });
    }
  );
});
