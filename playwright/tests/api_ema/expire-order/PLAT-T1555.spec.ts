import { expect, test } from '@support/fixtures';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';
import * as crypto from 'crypto';

let privateKey: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let orderToken: string;
let orderId: string;

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'johndoe@email.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'dlocal',
    card_info: {
      expiry_month: '12',
      expiry_year: '2025',
      card_holder: 'John Doe',
      card_holder_dni: '12345678',
      card_number: '4111111111111111',
      card_cvv: '123',
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      zip: '11510',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX',
      phone: '',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
  });

  test(
    '@PLAT-T1555 | Should fail to purchase an expired order',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService, userAuthService, paymentService }) => {
      await test.step('User tries to purchase an expired order', async () => {
        const userToken = (
          await userAuthService.loginAsGuest(merchantId, privateKey, crypto.randomUUID())
        ).data.token;

        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
        orderId = tokenizeResponse.data.order.order_id;
        const orderToken = tokenizeResponse.data.token;

        await emaService.expireOrder(orderToken, privateKey);

        purchaseRequest.order_token = orderToken;
        const response = await paymentService.purchaseV2(
          privateKey,
          userToken,
          purchaseRequest,
          true
        );

        const { error } = response.data;

        expect(error).toBeDefined();
        expect(error.code).toBe('EMA-6019');
        expect(error.description).toBe('order expired');
      });
    }
  );
});
