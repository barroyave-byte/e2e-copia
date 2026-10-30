import { EmailGenerator } from '@support/utils/EmailGenerator';
import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const body_sent = {
  payer_info: {
    email: EmailGenerator.generatePayerEmail(),
  },
  order_type: 'DEUNA_NOW',
  payment_source: {
    method_type: 'bank_transfer', //HIGH REQUIRED
    processor: 'spei_opm', //HIGH REQUIRED
  },
  order: {
    order_id: crypto.randomUUID(),
    currency: 'MXN',
    statement_descriptor: 'test',
    market_type: 'ecommerce',
    items: [
      {
        id: '00ab2d23-f44a-4782-aa7c-bb4fadeddfe3',
        name: 'Item #1',
        description: 'Description Item #1',
        total_amount: {
          original_amount: 115000,
          amount: 115000,
          total_discount: 0,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 100000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://cdn.prod.website-files.com/66269d6696cb4969aa25e070/662d847fb61e3145e2b2f640_Logo%20DEUNA.svg',
        taxable: true,
      },
      {
        id: '3cb41aec-1be8-4255-a386-94bb316a8157',
        name: 'Item #2',
        description: 'Description Item #2',
        total_amount: {
          original_amount: 115000,
          amount: 115000,
          total_discount: 0,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 100000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://cdn.prod.website-files.com/66269d6696cb4969aa25e070/662d847fb61e3145e2b2f640_Logo%20DEUNA.svg',
        taxable: true,
      },
    ],
    sub_total: 200000,
    tax_amount: 30000,
    total_tax_amount: 30000,
    total_amount: 230000,
    store_code: 'all',
    billing_address: {
      id: '4255',
      first_name: 'Jhon Doe',
      last_name: 'Doe',
      email: 'jhon.doe@example.com',
      address1: '123 Main St',
      address2: 'Apt 4B',
      zipcode: '12345',
      city: 'Mexico City',
      state_name: 'Mexico City',
      country_code: 'MX',
      identity_document: '123456789',
      identity_document_type: 'CURP',
      phone: '5551234567',
      lat: -22.943934,
      lng: -43.182984,
      additional_description: 'confirm',
      address_type: 'home',
    },
  },
};

test.describe('@regression Purchase with SPEI OPM', () => {
  let result: any = {};
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.createSpeiOpm(),
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T186 Successful purchase SPEI OPM with pending status',
    { tag: ['@payments_integration', '@team_payconnect'] },
    async ({ paymentService, emaService }) => {
      await test.step('User makes a purchase with Spei Opm', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_sent as any)
        ).data as any;

        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment.data.status).toEqual('pending');

        result = purchase_v2;
      });
      await test.step('It is validated that the order has been processed successfully with status pending', async () => {
        const status = 'pending';
        await retryGetOrderStatus(emaService, privateKey, result.order_token, status, 3, 5000);
      });
    }
  );
});
