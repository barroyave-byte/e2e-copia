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
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';

const configMerchant = new ConfigMerchant();
const paymentBody = {
  payer_info: {
    email: 'Edwin.Thompson@hotmail.com',
    date_of_birth: '1990-08-30T16:00:00.000Z',
    save_user_info: false,
  },
  callback_urls: {
    on_success: 'https://www.google.com/search?q=success',
    on_reject: 'https://www.google.com/search?q=reject',
    on_canceled: 'https://www.google.com/search?q=canceled',
    on_failed: 'https://www.google.com/search?q=failed',
  },
  payment_source: {
    method_type: 'credit_card',
    processor: 'stripe',
    card_info: {
      expiry_month: '12',
      expiry_year: '2030',
      card_holder: 'Joel Fabian',
      card_holder_dni: '12334568799',
      card_number: '4242424242424242',
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
      response_url: 'www.merchant.com/checkout123',
      description: 'description',
    },
  },
  anti_fraud_info: {
    ip_address: '192.1.1.0.0',
    user_agent: 'PostmanRuntime/7.42.0',
    browser_details: {
      accept_header: '*/*',
    },
    device: {
      id: crypto.randomUUID(),
    },
  },
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'MXN',
    items_total_amount: 21750,
    tax_amount: 0,
    sub_total: 21750,
    shipping_amount: 1000,
    shipping_tax_amount: 0,
    total_tax_amount: 650,
    total_amount: 22400,
    shipping_methods: [
      {
        code: '12345JR',
        name: 'Fast Delivery',
        cost: 2500,
      },
    ],
    discounts: [],
    metadata: {
      key1: 'identificador 1',
      key2: 'identificador 2',
    },
    items: [
      {
        id: 'd22c9def-ea22-41e0-aace-f2d6aba663ed',
        name: 'Premium Baby Beef',
        description: 'Premium Baby Beef Estancia 92 Angus',
        total_amount: {
          original_amount: 21000,
          amount: 20500,
          total_discount: 1000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 10500,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 500,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 2,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
      {
        id: '72537a90-8caf-4e8c-bb24-d101fb768532',
        name: 'Entraña Premium',
        description: 'Entraña Estancia 92 Angus ',
        total_amount: {
          original_amount: 750,
          amount: 900,
          total_discount: 0,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 750,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 150,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],
    shipping_options: {
      type: 'delivery',
    },
    shipping_address: {
      id: '204',
      first_name: 'Juan',
      last_name: 'Silva',
      email: 'Eldon.Kessler17@hotmail.com',
      address1: 'Calle 90 #14-26',
      address2: 'Oficina 417',
      zipcode: '110121',
      city: 'Bogota',
      state_name: 'Bogota',
      country_code: 'CO',
      identity_document: '1053795396',
      identity_document_type: 'CC',
      phone: '+573204517068',
      lat: -22.943934,
      lng: -43.182984,
      additional_description: 'confirmar',
      address_type: 'casa',
    },
    billing_address: {
      id: '179',
      first_name: 'Juan',
      last_name: 'Silva',
      email: 'Erin18@gmail.com',
      address1: 'Calle 90 #14-26',
      address2: 'Oficina 417',
      zipcode: '110121',
      city: 'Bogota',
      state_name: 'Bogota',
      country_code: 'CO',
      identity_document: '1053795396',
      identity_document_type: 'CC',
      phone: '+573204517068',
      lat: -22.943934,
      lng: -43.182984,
      address_type: 'casa',
    },
    user_instructions: 'pesar antes de enviar',
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
      accept_header: '*/*',
      user_agent: 'PostmanRuntime/7.42.0',
    },
    webhook_urls: {
      notify_order: 'https://webhook.site/5f19a36f-8931-4317-a850-fe102f93edbb',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      'Tarifa de envio': '',
    },
  },
};
let purchaseResponse;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T134 Purchase with billing address 2 - Signifyd Post authorization',
    {
      tag: [
        '@i-hub-global',
        '@admin_connection',
        '@admin-preprod',
        '@team_payments_capabilities',
        '@preprod',
        '@authorization',
      ],
    },
    async ({ page, paymentService }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const adminCommercePage = new AdminCommercePage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures a new Signifyd connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.signifyd,
          processorsConfig.signifydFraudProcessor
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

      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRoutingPostAuthorization(
          ConnectionsAvailable.signifyd,
          ConnectionsAvailable.stripeDirect
        );
      });

      await test.step('User performs the payment', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        purchaseResponse = (
          await paymentService.purchaseV2(privateKey, userAuthToken, paymentBody as any)
        ).data;
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const purchase_v2 = purchaseResponse;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual('processed');
      });
    }
  );
});
