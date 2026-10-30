import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT/DeunacheckoutOrderBuilder';
import * as crypto from 'crypto';

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PLAT-T1553 | Should fail to expire an order when status is not pending',
    { tag: ['@team_platform'] },
    async ({ emaService, paymentService, page }) => {
      await test.step('User tries to expire a non-pending order', async () => {
        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );

        const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
          user_email: 'johndoe@email.com',
        });
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          orderBody
        );
        const orderToken = tokenizeResponse.data.token;

        const purchaseRequest: PurchaseRequestV2 = {
          order_token: orderToken,
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

        await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest);

        await page.waitForTimeout(5000);
        const orderPaymentStatus = await apiCallNewman.getOrderPaymentStatus(
          privateKey,
          orderToken
        );
        console.log('Order payment status:', orderPaymentStatus);
        expect(orderPaymentStatus.orderStatus).toBe('processed');

        const expireResponse = await emaService.expireOrder(orderToken, privateKey, true);

        const { error } = expireResponse.data as any;
        expect(error).toBeDefined();
        expect(error.code).toBe('EMA-6020');
        expect(error.description).toBe(
          "cannot expire order with an order.status different than 'pending'"
        );
      });
    }
  );
});
