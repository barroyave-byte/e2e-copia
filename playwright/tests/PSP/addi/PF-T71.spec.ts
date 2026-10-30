import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect } from '@support/fixtures';
import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { test } from '@support/fixtures';

const configMerchant = new ConfigMerchant();

const purchasePayloadV2 = {
  order_token: '',
  payer_info: {
    email: 'jrolda@deuna.com',
  },
  payment_source: {
    method_type: 'bnpl',
    processor: 'addi',
    method_type_specific_fields: {
      description: 'Compra de prueba',
      callbacks: {
        on_success: 'https://www.deuna.com/',
        on_reject: '',
        on_canceled: '',
        on_failed: ' ',
      },
    },
  },
  order: {
    billing_address: {
      id: '1',
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'jroldan@deuna.com',
      identity_document: '74857601',
      identity_document_type: 'CC',
      address1: 'Carrera 7',
      address2: 'Chapinero',
      zipcode: '110231',
      city: 'Bogotá',
      state_name: 'Cundinamarca',
      country: 'Colombia',
      phone: '+573201234567',
      address_type: 'home',
    },
    shipping_address: {
      id: '22',
      first_name: 'Pablo',
      last_name: 'Murillo',
      email: 'jmurillo@deuna.com',
      identity_document: '74857601',
      identity_document_type: 'CC',
      address1: 'Avenida El Poblado',
      address2: 'Zona Rosa',
      zipcode: '050021',
      city: 'Medellín',
      state_name: 'Antioquia',
      country: 'Colombia',
      phone: '+573305678910',
      address_type: 'casita',
    },
  },
  anti_fraud_info: {
    device_id: crypto.randomUUID(),
    browser_details: {
      screen_height: 1200,
      screen_width: 600,
      user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      ip_address: '192.143.0.100',
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
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.addiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T71 (1.0) Purchase V2 pendiente con addi usando API en Colombia',
    { tag: ['@payments_integration', '@team_payconnect', '@fixme_preprod'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase using new browser detail fields', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
      });

      const result = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderId = result.data.order.order_id;

      const orderToken = result.data.token;
      expect(orderToken).not.toBeUndefined();

      purchasePayloadV2.order_token = orderToken;
      const resultPurchase = (
        await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayloadV2 as any)
      ).data as any;
      const statusOrder = resultPurchase.order.status;
      expect(statusOrder).toBe('pending');
      const pay = resultPurchase.order.payment.data;
      const statusPayment = pay.status;
      expect(statusPayment).toBe('pending');
      const next_action = pay.next_action.action;
      expect(next_action).toBe('authorization_bnpl');
      const authorization_bnpl = pay.next_action.authorization_bnpl;
      expect(authorization_bnpl).not.toBeUndefined();
      const redirect_url = authorization_bnpl.redirect_url;
      expect(redirect_url).not.toBeUndefined();
      expect(redirect_url).not.toBe('');
    }
  );
});
