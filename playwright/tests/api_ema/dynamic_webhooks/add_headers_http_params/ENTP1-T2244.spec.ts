import { test, expect } from '@support/fixtures';
import envConfig from '@support/envConfig';
import { buildWebhookWithHttpMethodInvalid } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description:
    "Key: 'CreateWebhook.HttpMethod' Error:Field validation for 'HttpMethod' failed on the 'oneof' tag: GET POST PUT PATCH",
  code: 'CHKCONFIG-1003',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2244 Crear webhook especificando un metodo HTTP PUT',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithHttpMethodInvalid();
      const webhookResponse = await checkoutConfigurationService.createWebhook(
        merchantData.merchantId,
        merchantData.merchantToken,
        webhookBody,
        true
      );
      expect(webhookResponse.status).toBe(400);
      expect(webhookResponse.data.error).toBeDefined();
      expect(webhookResponse.data.error.code).toBe(EXPECTED_ERROR.code);
      expect(webhookResponse.data.error.description).toBe(EXPECTED_ERROR.description);
    }
  );
});
