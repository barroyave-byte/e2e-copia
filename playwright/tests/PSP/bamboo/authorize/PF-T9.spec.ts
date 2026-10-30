import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();

const body_sent_purchase_v2 = {
  order_token: '',
  order_type: 'DEUNA_CHECKOUT',
  payer_info: {
    save_user_info: false,
    email: 'jhondoe@deuna.com',
  },
  payment_source: {
    method_type: 'credit_card',
    processor: 'BAMBOO',
    card_info: {
      expiry_month: '08',
      expiry_year: '2030',
      card_number: '5299910010000015',
      card_cvv: '123',
      card_holder: 'John Smith',
      card_holder_dni: '74857601',
      zip: '7521',
      city: 'Ibarra',
      address1: 'La Ballena Capilla virgen del valle',
      state: 'Buenos Aires',
      phone: '+5521987654321',
      country: 'Argentina',
    },
  },
  billing_address: {
    id: 1896,
    country: 'ARG',
    address_type: 'home',
    is_default: false,
    first_name: 'Name',
    last_name: 'Factura',
    phone: '+5521987654321',
    identity_document: '74857601',
    identity_document_type: 'DNI',
    lat: -0.100032,
    lng: -78.46956,
    address1: 'La Ballena',
    address2: 'Capilla virgen del valle',
    city: 'Buenos Aires',
    zipcode: '7521',
    state_name: 'Buenos Aires',
    additional_description: 'No tocar timbre',
  },
  shipping_address: {
    id: 333,
    country: 'Argentina',
    address_type: 'home',
    is_default: false,
    first_name: 'Name',
    last_name: 'Comprador',
    phone: '+5521987654321',
    identity_document: '74857601',
    identity_document_type: 'DNI',
    lat: -0.100032,
    lng: -78.46956,
    address1: 'Caballito',
    address2: 'Calle Guayaquil',
    city: 'Buenos Aires',
    zipcode: '1406',
    state_name: 'Buenos Aires',
    additional_description: 'No tocar timbre',
  },
  anti_fraud_info: {
    browser_details: {
      screen_height: 101,
      screen_width: 303,
      color_depth: 20,
      java_enabled: true,
      java_script_enabled: true,
      language: 'en-US',
      time_zone_offset: 289,
      accept_header: '*/*',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bambooAuthorizeProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PF-T9 (1.0) Authorize V2 exitoso VISA con BAMBOO usando API en ARGENTINA',
    {
      annotation: { type: 'bug', description: 'PI-2888' },
      tag: ['@payments_integration', '@team_payconnect'],
    },
    async ({ page, emaService, paymentService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        const result = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
          user_email: EmailGenerator.generatePayerEmail(),
        });
        orderId = result.data.order.order_id;

        const orderToken = result.data.token;
        expect(orderToken).not.toBeUndefined();

        body_sent_purchase_v2.order_token = orderToken;

        await paymentService.purchaseV2(privateKey, userAuthToken, body_sent_purchase_v2 as any);
      });
    }
  );
});
