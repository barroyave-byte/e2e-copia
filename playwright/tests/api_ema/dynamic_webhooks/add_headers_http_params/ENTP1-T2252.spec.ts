import { expect, test } from '@support/fixtures';
import { buildWebhookWithHeadersRepeted } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description:
    "Key: 'CreateWebhook.Headers' Error:Field validation for 'Headers' failed on the 'validate_repeated_slice' tag: keys cannot be repeated",
  code: 'CHKCONFIG-1003',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2252 Crear webhook especificando headers repetidos',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithHeadersRepeted();
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
