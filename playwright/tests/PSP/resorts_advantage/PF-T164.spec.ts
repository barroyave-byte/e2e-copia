import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();
const purchasePayloadV2 = {
  order_token: '',
  callback_url: 'https://www.google.com/search?q=callback_url',
  payer_info: {
    email: 'avaldivia@deuna.com',
    full_name: 'John Smith',
  },
  payment_source: {
    method_type: 'credit_card',
    processor: 'resorts_advantage',
    card_info: {
      expiry_month: '12',
      expiry_year: '2030',
      card_holder: 'Jean Roldan',
      card_holder_dni: '12334568799',
      card_number: '4111111111111111',
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
      description: 'order description',
      callbacks: {
        on_success: 'https://www.google.com/search?q=success',
        on_reject: '',
        on_canceled: 'https://www.deuna.com/',
        on_failed: ' ',
      },
    },
  },
  order: {
    metadata: {
      company_id: 'RHCA',
      customer_id: 'test',
      payment_type: '9000',
      collector_login: 'login collector',
      point_of_sale: 'RoyalTest',
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
      country: 'CO',
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
      country: 'CO',
      identity_document: '1053795396',
      identity_document_type: 'CC',
      phone: '+573204517068',
      lat: -22.943934,
      lng: -43.182984,
      address_type: 'casa',
    },
  },
  anti_fraud_info: {
    device_id: crypto.randomUUID(),
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
      user_agent: 'PostmanRuntime/7.42.0',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderId: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('US');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('US', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.resortsAdvantageProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PF-T164 Purchase V2 - Resorts Advantage',
    { annotation: { type: 'bug', description: 'PF-3774' }, tag: ['@team_payconnect'] },
    async ({ emaService, paymentService }) => {
      await test.step('User makes a purchase with Resorts Advantage', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        expect(orderToken).not.toBeUndefined();

        purchasePayloadV2.order_token = orderToken;

        await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayloadV2 as any);
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
