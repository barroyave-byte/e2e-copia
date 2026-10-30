import { expect, test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

const VALID_WEBHOOK_URL = 'https://eo4rris0g0moq48.m.pipedream.net';

let orderToken: string;
let merchantId: string;
let merchantName: string;
let privateKey: string;
let orderId: string;
let eventName: string;

test.describe('@regression Dynamic Webhooks.', () => {
  test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const merchantToken = merchant.merchantToken;

    await checkoutConfigurationService.createCustomField(
      {
        field_name: 'tip_amount',
        placeholder: 'Propina',
        field_type: 'integer',
        validation: { required: false, maximum: 2000, exclusive_minimum: 0 },
      },
      merchantId,
      merchantToken
    );

    await checkoutConfigurationService.createCustomField(
      {
        field_name: 'countries',
        placeholder: 'Paises',
        field_type: 'multiselect',
        items_enum: ['col', 'mex', 'ecu', 'chl', 'per'],
        validation: { required: false, min_items: 2, depends_on: 'tipAmount' },
      } as any,
      merchantId,
      merchantToken
    );

    eventName = `event_1_${faker.number.int({ min: 20, max: 1000 })}`;
    await checkoutConfigurationService.createWebhook(merchantId, merchantToken, {
      event_name: eventName,
      url: VALID_WEBHOOK_URL,
      fields_update: {
        fields: ['StoreCode', 'TaxAmount'],
        custom_fields: ['tip_amount', 'countries'],
      },
      response_body: {
        fields: ['Order', 'ShippingRate'],
        custom_fields: ['tip_amount'],
      },
    });

    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderId = tokenizeResult.data.order.order_id;
    orderToken = tokenizeResult.data.token;
  });

  test(
    '@ENTP1-T2209 Webhook Dinámico: Validar que al ejecutarse el webhook, actualice los campos de la orden definidos',
    { tag: ['@team_platform'] },
    async ({ emaService }) => {
      await test.step('Step 1: Execute dynamic webhook and verify it updates order fields', async () => {
        const response = await emaService.executeDynamicWebhook(orderToken, privateKey, eventName, {
          data: { amount: 5000 },
        });

        expect(response.status).toBe(200);

        const body = response.data as any;
        expect(body.order.store_code).toBe('XYZ');
        expect(body.order.tax_amount).toBe(5);
        expect(body.custom_fields).toBeTruthy();
        expect(body.custom_fields.length).toBe(1);
        expect(body.custom_fields[0].value).toBe(1000);
        expect(body.shipping_rate).toBeTruthy();
        expect(body.shipping_rate.service_name).toBe('todo');
        expect(body.shipping_rate.cost).toBe(1000);
      });
    }
  );
});
