import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  buildWebhookFieldsAcceptedByDEUNA,
  buildWebhookWithCustomFields,
  buildWebhookWithInvalidUrl,
  buildWebHookWithTemplateTransformation,
} from '@support/http/testData/checkout_configuration/WebHookConfig';
import {
  bodyCustomFieldTip,
  bodyCustomFieldCountries,
} from '@support/http/testData/checkout_configuration/CustomField';
import { createCustomFields, createWebhooks } from './webhookTestHelpers';

let merchantConfig: any;
const configMerchant = new ConfigMerchant();
let webhookResponse: any;

test.describe('@regression Dynamic Webhooks.', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@ENTP1-T2240 Actualizar exitosamente un template de transformación de responses',
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
          buildWebHookWithTemplateTransformation(),
          true
        );
      });

      await test.step('Verify webhook response', async () => {
        expect(webhookResponse.status).toBe(200);
        expect(webhookResponse.data.data.active).toBe(true);
      });

      await test.step('Update webhook with response template transformation', async () => {
        const eventName = webhookResponse.data.data.event_name;
        webhookResponse = await checkoutConfigurationService.updateWebhook(
          merchantConfig.merchantId,
          merchantConfig.merchantToken,
          eventName,
          buildWebhookFieldsAcceptedByDEUNA(),
          true
        );
      });

      await test.step('Verify webhook response', async () => {
        expect(webhookResponse.status).toBe(200);
        expect(webhookResponse.data.data.active).toBe(true);
      });
    }
  );
});
