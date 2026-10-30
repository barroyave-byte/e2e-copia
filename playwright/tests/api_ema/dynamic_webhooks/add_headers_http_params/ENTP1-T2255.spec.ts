import { expect, test } from '@support/fixtures';
import { buildWebhookWithHeadersAndMethodValidWithoutParams } from '@support/http/testData/checkout_configuration/WebHookConfig';

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2255 happy path: Crear webhook SIN params, method valido y headers correctos',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithHeadersAndMethodValidWithoutParams();
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
    }
  );
});
