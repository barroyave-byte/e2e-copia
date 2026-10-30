import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';

const configMerchant = new ConfigMerchant();

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'jroldan@deuna.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'BAMBOO',
    card_info: {
      card_holder_dni: '74857601',
      card_holder_dni_type: 'DNI',
      expiry_month: '08',
      expiry_year: '2030',
      card_holder: 'John Smith',
      card_number: '5299910010000015',
      card_cvv: '123',
      address1: 'La Ballena',
      zip: '7521',
      city: 'Buenos Aires',
      state: 'Buenos Aires',
      country: 'Argentina',
      phone: '+5521987654321',
    },
  },
  anti_fraud_info: {
    user_agent: 'postman',
    device: {
      id: '5e232fcd-9db2-4cfc-a3cb-15f4d004d81b',
      fingerprint: '',
      fingerprint_provider: '',
      name: '',
    },
    browser_details: {
      screen_height: 100,
      screen_width: 200,
      accept_header: '*/*',
      color_depth: 57,
      java_enabled: true,
      java_script_enabled: true,
      language: 'en-US',
      time_zone_offset: 500,
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
      processorsConfig.bambooProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PF-T5 (1.0) Purchase V1 exitoso VISA con BAMBOO usando API en ARGENTINA',
    {
      annotation: { type: 'bug', description: 'PI-2888' },
      tag: ['@payments_integration', '@team_payment_integration', '@team_payconnect'],
    },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase using new browser detail fields', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
      });

      const result = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
        user_email: EmailGenerator.generatePayerEmail(),
      });
      orderId = result.data.order.order_id;

      const orderToken = result.data.token;
      expect(orderToken).not.toBeUndefined();

      purchaseRequest.order_token = orderToken;
      await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest);
    }
  );
});
