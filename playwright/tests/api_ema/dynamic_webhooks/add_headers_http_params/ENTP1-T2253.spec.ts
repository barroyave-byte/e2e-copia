import { expect, test } from '@support/fixtures';
import { buildWebhookWithHeadersParamsAndMethodValid } from '@support/http/testData/checkout_configuration/WebHookConfig';

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2253 Crear webhook con parametros que coinciden con el template',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithHeadersParamsAndMethodValid();
      const webhookResponse = await checkoutConfigurationService.createWebhook(
        merchantData.merchantId,
        merchantData.merchantToken,
        webhookBody
      );

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.data.data).not.toBeNull();
      expect(webhookResponse.data.error).toBeUndefined();

      const webHookDataResponse = webhookResponse.data.data!;
      expect(webHookDataResponse.active).toBe(true);
      expect(webHookDataResponse.url).toBe(webhookBody.url);
      expect(webHookDataResponse.http_method).toBe('PUT');
      expect(webHookDataResponse.headers[0].key).toBe('X-Authorization');
      expect(webHookDataResponse.headers[0].value).toBe(
        '{{ .Order.CustomFields.Data.external_auth_token}}'
      );
      expect(webHookDataResponse.params[0].key).toBe('card_id');
      expect(webHookDataResponse.params[0].value).toBe('{{ .Order.CustomFields.Data.card_id}}');
      expect(webHookDataResponse.query_params[0].key).toBe('business_id');
      expect(webHookDataResponse.query_params[0].value).toBe(
        '{{ .Order.CustomFields.Data.business_id}}'
      );
    }
  );
});
