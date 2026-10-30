import { test, expect } from '@support/fixtures';
import * as crypto from 'crypto';
import { TokenizeOrderRequestData } from '@support/http/models/order';

const order_id = crypto.randomUUID();
const body_sent = {
  order_type: 'PAYMENT_LINK',
  order: {
    order_id: order_id,
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    tax_amount: 3000,
    shipping_amount: 3000,
    items_total_amount: 3000,
    sub_total: 3000,
    processor_name: 'all',
    total_amount: 3000,
    store_code: 'all',
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          currency: 'USD',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 850,
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 100,
          currency: 'USD',
          currency_symbol: '$',
        },
        quantity: 1,
        uom: 'string',
        upc: 'string',
        sku: 'SKU-11021',
        isbn: '12-345-678-90123',
        brand: 'Bolt Swagstore',
        manufacturer: 'Bolt Factory',
        category: 'hats',
        color: 'Red',
        size: 'XXL',
        weight: {
          weight: 22,
          unit: 'kg',
        },
        image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        type: 'physical',
        taxable: true,
      },
    ],
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let privateKey = '';
  let merchantId: string;
  let merchantName: string;

  test.beforeAll(async ({ merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ENTP1-T2204 Tokenizar una orden de tipo PAYMENT_LINK con el campo items con datos',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        const response = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent as TokenizeOrderRequestData
        );
        expect(response.status).toBe(200);
        expect(response.data.token).toBeTruthy();
        expect(response.data.order_type).toBe('PAYMENT_LINK');
        expect(response.data.order.payment_link).toContain(response.data.token);
        expect(response.data.order.items.length).toBe(1);
      });
    }
  );
});
