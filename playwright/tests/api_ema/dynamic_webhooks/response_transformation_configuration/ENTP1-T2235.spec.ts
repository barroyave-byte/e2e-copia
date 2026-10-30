import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  bodyCustomFieldTip,
  bodyCustomFieldCountries,
} from '@support/http/testData/checkout_configuration/CustomField';
import {
  buildWebhookWithCustomFields,
  buildWebhookWithInvalidUrl,
  buildTemplateTransformationWithError,
} from '@support/http/testData/checkout_configuration/WebHookConfig';
import { createCustomFields, createWebhooks } from './webhookTestHelpers';
let merchantConfig: any;
const configMerchant = new ConfigMerchant();
let webhookResponse: any;

test.describe('@regression Dynamic Webhooks.', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@ENTP1-T2235 Validar error al momento de intentar crear un template de transformacion de responses',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('Create merchant configuration', async () => {
        merchantConfig = await configMerchant.basicSetup('MX');
        merchantId = merchantConfig.merchantId;
        merchantName = merchantConfig.merchantName;
        privateKey = merchantConfig.privateKey;
      });

      await test.step('Create custom fields webhook', async () => {
        await createCustomFields(
          checkoutConfigurationService,
          [bodyCustomFieldTip, bodyCustomFieldCountries],
          merchantConfig.merchantId,
          merchantConfig.merchantToken
        );
      });

      await test.step('Create Dynamic Webhooks pre-request', async () => {
        await createWebhooks(
          checkoutConfigurationService,
          [{ data: buildWebhookWithCustomFields() }, { data: buildWebhookWithInvalidUrl() }],
          merchantConfig.merchantId,
          merchantConfig.merchantToken
        );
      });

      await test.step('Create Dynamic Webhook with response template transformation', async () => {
        webhookResponse = await checkoutConfigurationService.createWebhook(
          merchantConfig.merchantId,
          merchantConfig.merchantToken,
          buildTemplateTransformationWithError(),
          true
        );
      });

      await test.step('Verify webhook response', async () => {
        expect(webhookResponse.status).toBe(409);
        expect(webhookResponse.data.error.code).toBe('CHKCONFIG-4100');
        expect(webhookResponse.data.error.description).toBe(
          'unknown fields found in the template: order.nof_found'
        );
      });
    }
  );
});
