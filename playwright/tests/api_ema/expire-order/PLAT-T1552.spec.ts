import { test, expect } from '@support/fixtures';
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
      card_number: '4349008516656431',
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
    '@PLAT-T1552 | Should expire an order when status is pending with last payment attempt denied',
    { tag: ['@team_platform', '@preprod', '@order_expiration', '@api'] },
    async ({ emaService, userAuthService, paymentService }) => {
      await test.step('User tries to expire an order with last payment attempt denied', async () => {
        const userToken = (
          await userAuthService.loginAsGuest(merchantId, privateKey, crypto.randomUUID())
        ).data.token;

        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
        orderId = tokenizeResponse.data.order.order_id;
        const orderToken = tokenizeResponse.data.token;

        purchaseRequest.order_token = orderToken;
        await paymentService.purchaseV2(privateKey, userToken, purchaseRequest, true);

        const response = await emaService.expireOrder(orderToken, privateKey);
        const { order } = response.data;

        expect(order).toBeDefined();
        expect(order.status).toBe('expired');
        expect(order.expired_at).toBeDefined();
      });
    }
  );
});
