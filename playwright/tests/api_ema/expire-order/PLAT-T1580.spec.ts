import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.asaasPixProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PLAT-T1580 | Should expire a bank_transfer(pix) order when status is pending and payment intent is pending',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to purchase an expired order', async () => {
        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );

        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
        orderId = tokenizeResponse.data.order.order_id;
        orderToken = tokenizeResponse.data.token;

        await paymentService.purchase(
          privateKey,
          userAuthToken,
          {
            token: orderToken,
            email: 'jrolda@deuna.com',
            method_type: 'bank_transfer',
            processor_name: 'ASAAS_PIX',
            specificFields: {
              expiration_date: '2025-05-08 14:20:51',
              description: 'Test PIX DEUNA',
            },
            callback_url: 'URL',
            device_id: faker.string.uuid(),
            billing_address: {
              first_name: 'Jean',
              last_name: 'Roldan',
              email: 'jroldan@deuna.com',
              identification: '853.513.468-93',
              identification_type: 'CPF',
              address1: 'Rua Capote Valente',
              address2: 'Pinheiros',
              zipcode: '05409000',
              city: 'São Paulo',
              state_name: 'SP',
              country: 'BR',
              phone: '+5521988939196',
              address_type: 'home',
            },
            shipping_address: {
              first_name: 'Pablo',
              last_name: 'Murillo',
              email: 'jmurillo@deuna.com',
              identification: '870.685.970/41',
              identification_type: 'CPF',
              address1: 'Praia de Botafogo St.,',
              address2: '3o. Andar',
              zipcode: '22250040',
              city: 'Rio de Janeiro',
              state_name: 'RJ',
              country: 'BR',
              phone: '+551146733466',
              address_type: 'home',
            },
            user_id: null,
            browser_details: {
              screen_height: 1200,
              screen_width: 600,
              user_agent: 'blabla',
              ip_address: '192.168.0.100',
            },
          } as any,
          true
        );

        const expireResponse = await emaService.expireOrder(orderToken, privateKey);

        const { token, order, error } = expireResponse.data as any;
        expect(error).toBeUndefined();
        expect(token).toBeDefined();
        expect(order).toBeDefined();
        expect(order.status).toBe('expired');
      });
    }
  );
});
