import { expect, test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import DateTime from '@support/utils/datetime';
import * as crypto from 'crypto';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';
import * as creditCard from '@support/interfaces/credit_cards';

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
    '@PLAT-T1557 | Should purchase a valid order with future expiration date',
    { tag: ['@team_platform', '@preprod', '@purchase', '@order_expiration', '@api'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to purchase a valid order with future expiration date', async () => {
        const expirationDate = DateTime.now().addDays(1).toJSON();

        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );

        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(privateKey, {
          order: {
            order_id: faker.string.uuid(),
            user_id: faker.string.uuid(),
            expires_at: expirationDate,
            currency: 'MXN',
            items_total_amount: 110000,
            total_amount: 90000,
            sub_total: 90000,
            store_code: 'all',
            payer_info: { email: 'johndoe@email.com' },
            items: [
              {
                id: '79',
                name: '10 ASINHAS DE FRANGO',
                description: '10 alitas picantes',
                total_amount: {
                  amount: 110000,
                  currency: 'MXN',
                  currency_symbol: '$',
                },
                quantity: 2,
                sku: 'SKU-11021',
                category: 'hats',
                type: 'physical',
              },
            ],
          },
        } as any);

        const orderToken = tokenizeResponse.data.token;

        const purchaseRequest: PurchaseRequestV2 = {
          order_token: orderToken,
          payer_info: { email: 'johndoe@email.com' },
          payment_source: {
            method_type: MethodType.CREDIT_CARD,
            processor: 'dlocal',
            card_info: {
              expiry_month: '12',
              expiry_year: '2028',
              card_holder: 'John Doe',
              card_holder_dni: '12345678',
              card_number: creditCard.kushkiVisaSuccessfull.number,
              card_cvv: '123',
              address1: 'José Luis Lagrange 456, Colonia Polanco',
              zip: '11510',
              city: 'Ciudad de México',
              phone: '',
            },
          },
        };

        const purchaseResponse = await paymentService.purchaseV2(
          privateKey,
          userAuthToken,
          purchaseRequest
        );

        const order = (purchaseResponse.data as any)?.order;

        expect(order).toBeDefined();
        expect(order.status).toBe('succeeded');
        expect(order.payment?.data?.status).toBe('processed');
      });
    }
  );
});
