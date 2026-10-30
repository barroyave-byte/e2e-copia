import { expect, test } from '@support/fixtures';
import { SERVICE_KEYS } from '@support/http/types/ServiceTypes';
import { buildWebhookWithInvalidUrlParams } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description: 'the parameter param1 mapped in the URL does not exist in the list',
  code: 'CHKCONFIG-4100',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test.fixme(
    '@ENTP1-T2247 Intentar crear un webhook con una url con params no especificados en el body',
    {
      annotation: { type: 'bug', description: 'PLAT-4071' },
      tag: ['@preprod', '@api', '@team_platform'],
    },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithInvalidUrlParams();
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
