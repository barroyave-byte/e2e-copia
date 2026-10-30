import { expect, test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

const INVALID_WEBHOOK_URL = 'https://notfound.m.pipedream.net';

let orderToken: string;
let eventNameFailed: string;
let privateKey: string;

test.describe('@regression Dynamic Webhooks.', () => {
  test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    const { merchantId, merchantToken } = merchant;
    privateKey = merchant.privateKey;

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

    eventNameFailed = `eventx_${faker.number.int({ min: 20, max: 1000 })}`;
    await checkoutConfigurationService.createWebhook(merchantId, merchantToken, {
      event_name: eventNameFailed,
      url: INVALID_WEBHOOK_URL,
      fields_update: {
        fields: ['StoreCode', 'TaxAmount'],
        custom_fields: ['tip_amount', 'countries'],
      },
      response_body: {
        fields: ['Order', 'ShippingRate'],
        custom_fields: ['tip_amount'],
      },
    });

    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: 300000,
    });
    orderToken = tokenizeResult.data.token;
  });

  test(
    '@ENTP1-T2210 Validar error cuando se ejecuta un webhook con una url que no está activa o no responde',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ emaService }) => {
      await test.step('Step 1: Execute webhook with unreachable URL and verify 500 error', async () => {
        const response = await emaService.executeDynamicWebhook(
          orderToken,
          privateKey,
          eventNameFailed,
          { data: { amount: 5000 } },
          true
        );

        expect(response.status).toBe(500);
      });
    }
  );
});
