import { test, expect } from '@support/fixtures';
import envConfig from '@support/envConfig';
import { buildWebhookWithoutHttpMethod } from '@support/http/testData/checkout_configuration/WebHookConfig';

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2243 Crear webhook sin especificar un metodo HTTP',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithoutHttpMethod();
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
      expect(webHookDataResponse.http_method).toBe('POST');
    }
  );
});
