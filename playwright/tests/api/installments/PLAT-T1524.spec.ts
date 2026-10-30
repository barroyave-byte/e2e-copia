import { expect, test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import type { TokenizeOrderRequestData } from '@support/http/models/order';

let regularOrderToken: string;
let noStoreOrderToken: string;

const noStoreOrderBody = {
  order: {
    order_id: faker.string.uuid(),
    currency: 'USD',
    timezone: 'America/Mexico_City',
    tax_amount: 50000,
    shipping_amount: 100000,
    items_total_amount: 100000,
    sub_total: 100000,
    total_amount: 100000,
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
        weight: { weight: 22, unit: 'kg' },
        image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        type: 'physical',
        taxable: true,
      },
    ],
    discounts: [
      {
        amount: 500,
        code: 'SUMMERFUN15',
        reference: 'SUMMERFUN15',
        description: '',
        details_url: 'https://boltswagstore.com/discounts/#12345',
        free_shipping: { is_free_shipping: false, maximum_cost_allowed: 100 },
        discount_category: 'coupon',
      },
    ],
    shipping_options: {
      type: 'pickup',
      details: {
        store_name: 'Store Name',
        address: '6 Rotermanni 11343 Talinn',
        address_coordinates: { lat: 4.721245, lng: -74.04673 },
        contact: { name: 'jhon snow', phone: '972514910' },
        additional_details: {
          pickup_time: '2021-11-03T22:09:09.086990957Z',
          stock_location: '',
        },
      },
    },
    user_instructions: 'This item is a gift.',
    metadata: { key1: 'value1', key2: 'value2' },
  },
};

test.describe('@regression validates the status codes returned by the get installments endpoint', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('NO_PROCESSOR_MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    const regularResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = regularResult.data.token;
    orderId = regularResult.data.order.order_id;
    regularOrderToken = regularResult.data.token;

    const noStoreResult = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      noStoreOrderBody as unknown as TokenizeOrderRequestData
    );
    noStoreOrderToken = noStoreResult.data.token;
  });

  test(
    '@PLAT-T1524 Validate errors other than 500 in get installments',
    {
      tag: [
        '@preprod',
        '@installments_mci_msi',
        '@api',
        '@installments',
        '@team_payments_capabilities',
      ],
    },
    async ({ paymentMsiService }) => {
      await test.step('Step 1: Get installments with invalid order token - expect 400 EMA-1002', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          'without_token',
          privateKey,
          '424242',
          true
        );
        expect(response.status).toBe(400);
        expect((response.data as any).error.code).toBe('EMA-1002');
        expect((response.data as any).error.description).toBe('cannot parse string to uuid');
      });

      await test.step('Step 2: Get installments with non-existent order UUID - expect 404 EMA-3001', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          '83079c73-f05a-4c25-9d9f-915a36f4195f',
          privateKey,
          '424242',
          true
        );
        expect(response.status).toBe(404);
        expect((response.data as any).error.code).toBe('EMA-3001');
        expect((response.data as any).error.description).toBe('order not found');
      });

      await test.step('Step 3: Get installments without bin and without card_id - expect 400 EMA-2000', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          regularOrderToken,
          privateKey,
          '',
          true
        );
        expect(response.status).toBe(400);
        expect((response.data as any).error.code).toBe('EMA-2000');
        expect((response.data as any).error.description).toBe('bin or cardID is required');
      });

      await test.step('Step 4: Get installments for order with empty store_code - expect 409 EM-1006', async () => {
        const response = await paymentMsiService.getOrderInstallments(
          noStoreOrderToken,
          privateKey,
          '424242',
          true
        );
        expect(response.status).toBe(409);
        expect((response.data as any).error.code).toBe('EM-1006');
        expect((response.data as any).error.description).toBe(
          'cannot process operation with empty store_code in order'
        );
      });
    }
  );
});
