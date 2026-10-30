import { expect, test } from '@support/fixtures';
import { buildWebhookWitHeadersParamsWithCharactersSpecial } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description:
    "Key: 'CreateWebhook.Params[0].Key' Error:Field validation for 'Key' failed on the 'alphanum_underscore' tag: must be an alphanumeric string and contain '-','_'\nKey: 'CreateWebhook.Headers[0].Key' Error:Field validation for 'Key' failed on the 'alphanum_underscore' tag: must be an alphanumeric string and contain '-','_'",
  code: 'CHKCONFIG-1003',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2249 Crear webhook especificando headers',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWitHeadersParamsWithCharactersSpecial();
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
