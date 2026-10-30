import { expect, test } from '@support/fixtures';
import { buildWebhookWithInvalidUrl } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description:
    "Key: 'CreateWebhook.URL' Error:Field validation for 'URL' failed on the 'http_url' tag",
  code: 'CHKCONFIG-1003',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test.fixme(
    '@ENTP1-T2246 Intentar crear un webhook con una url que no cumple con la sintaxis correcta',
    {
      annotation: { type: 'bug', description: 'PLAT-4066' },
      tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'],
    },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithInvalidUrl();
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
