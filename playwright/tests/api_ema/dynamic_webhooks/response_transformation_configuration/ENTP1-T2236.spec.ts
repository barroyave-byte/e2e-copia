import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  bodyCustomFieldTip,
  bodyCustomFieldCountries,
} from '@support/http/testData/checkout_configuration/CustomField';
import {
  buildWebhookWithCustomFields,
  buildWebhookWithInvalidUrl,
  buildTemplateTransformationWithInvalidJson,
  buildTemplateTransformationWithJsonWithoutBraces,
  buildTemplateTransformationWithJsonWithoutQuotes,
  buildTemplateTransformationWithJsonWithoutColon,
} from '@support/http/testData/checkout_configuration/WebHookConfig';
import { createCustomFields, createWebhooks } from './webhookTestHelpers';

const configMerchant = new ConfigMerchant();

const INVALID_JSON_CASES = [
  {
    name: 'falta coma',
    buildTemplate: buildTemplateTransformationWithInvalidJson,
    expectedDescription:
      "failed to unmarshal the template result: invalid character '\"' after object key:value pair",
  },
  {
    name: 'falta llaves',
    buildTemplate: buildTemplateTransformationWithJsonWithoutBraces,
    expectedDescription:
      'failed to compile the template: template: jsonTemplate:1: unexpected "}" in operand',
  },
  {
    name: 'falta comillas',
    buildTemplate: buildTemplateTransformationWithJsonWithoutQuotes,
    expectedDescription:
      "failed to unmarshal the template result: invalid character 'o' looking for beginning of object key string",
  },
  {
    name: 'falta dos puntos',
    buildTemplate: buildTemplateTransformationWithJsonWithoutColon,
    expectedDescription:
      "failed to unmarshal the template result: invalid character '\"' after object key",
  },
] as const;

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2236 Error al momento de intentar crear un template de transformacion de responses con formato json invalido - falta coma, comillas, dos puntos y llaves',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      let merchantConfig: any;

      await test.step('Create merchant configuration', async () => {
        merchantConfig = await configMerchant.basicSetup('MX');
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

      for (const { name, buildTemplate, expectedDescription } of INVALID_JSON_CASES) {
        await test.step(name, async () => {
          let webhookResponse: any;

          await test.step('Create Dynamic Webhook with response template transformation', async () => {
            webhookResponse = await checkoutConfigurationService.createWebhook(
              merchantConfig.merchantId,
              merchantConfig.merchantToken,
              buildTemplate(),
              true
            );
          });

          await test.step('Verify webhook response', async () => {
            expect(webhookResponse.status).toBe(409);
            expect(webhookResponse.data.error.code).toBe('CHKCONFIG-4100');
            expect(webhookResponse.data.error.description).toBe(expectedDescription);
          });
        });
      }
    }
  );
});
