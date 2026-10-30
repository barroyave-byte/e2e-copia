import { expect, test } from '@support/fixtures';
import { buildWebhookWithParamsAndMethodValidWithoutHeaders } from '@support/http/testData/checkout_configuration/WebHookConfig';

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2254 Crear webhook con headers que coinciden con el template',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithParamsAndMethodValidWithoutHeaders();
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
      expect(webHookDataResponse.params[0].key).toBe('card_id');
      expect(webHookDataResponse.params[0].value).toBe('{{ .Order.CustomFields.Data.card_id}}');
      expect(webHookDataResponse.query_params[0].key).toBe('business_id');
      expect(webHookDataResponse.query_params[0].value).toBe(
        '{{ .Order.CustomFields.Data.business_id}}'
      );
    }
  );
});
