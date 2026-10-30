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
    items_total_amount: 2800,
    sub_total: 2800,
    total_tax_amount: 0,
    shipping_amount: 0,
    total_amount: 2800,
    store_code: 'all',
    payer_info: {
      email: 'eposada@deuna.com',
    },
    webhook_urls: {
      notify_order: 'https://internal.deuna.io/api/v1/orders',
    },
    items: [],
  },
  custom_fields: {
    data: {
      external_auth_token:
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYWxzZWEtYXBpLXN0YWdpbmcub3JkZXJpbmcuY28vdjQwMC9lcy00MTktMS9hbHNlYS1zdGFnaW5nL2F1dGgiLCJpYXQiOjE2OTM0Mzk5MzEsImV4cCI6MTcyNDk3NTkzMSwibmJmIjoxNjkzNDM5OTMxLCJqdGkiOiJ1UGxmNHNpVDJPTkdxR2JpIiwic3ViIjoiMzc3MCIsImxldmVsIjozfQ.GMrUTFLo3PI7k1x5IGeNZzXlUT8Li8_NlI94EqYiXI4',
      brand_id: 9,
      user_id: 3770,
      wow_rewards_user_id: '2bd4e894-4791-11ee-8b97-3a96e2a65f99',
      employee_coupon: 'KDHHDBNCN',
      cash_rule: {
        min_amount: 10,
        max_amount: 100,
      },
      source: 'website',
    },
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
    '@ENTP1-T2220 Tokenizar una orden de tipo PAYMENT_LINK sin el campo fallback_url',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('User tries to tokenize an order successfully', async () => {
        const response = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          body_sent as unknown as TokenizeOrderRequestData
        );
        expect(response.status).toBe(200);
        expect(response.data.token).toBeTruthy();
        expect(response.data.order_type).toBeTruthy();
        expect(response.data.order_type).toBe('PAYMENT_LINK');
        expect((response.data.order as any).redirect_urls).toMatchObject({
          success: expect.any(String),
          pending: expect.any(String),
          error: expect.any(String),
          fallback: expect.any(String),
        });
      });
    }
  );
});
