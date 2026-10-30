import { expect, test } from '@support/fixtures';
import { SERVICE_KEYS } from '@support/http/types/ServiceTypes';
import { buildWebhookWithInvalidHeadersParams } from '@support/http/testData/checkout_configuration/WebHookConfig';

const EXPECTED_ERROR = {
  description:
    'failed to apply to the order the parameter template: card_id, template: jsonTemplate:1:9: executing "jsonTemplate" at <.Order.CustomFields1.Data.card_id>: can\'t evaluate field CustomFields1 in type interface {}',
  code: 'CHKCONFIG-4100',
};

test.describe('@regression Dynamic Webhooks.', () => {
  test(
    '@ENTP1-T2248 Crear webhook especificando un metodo HTTP PATCH',
    { tag: ['@preprod', '@checkout_ui', '@api', '@team_platform'] },
    async ({ merchantAuthService, checkoutConfigurationService }) => {
      const merchantData = await merchantAuthService.createBasicMerchant({
        country: 'MX',
      });
      const webhookBody = buildWebhookWithInvalidHeadersParams();
      const webhookResponse = await checkoutConfigurationService.createWebhook(
        merchantData.merchantId,
        merchantData.merchantToken,
        webhookBody,
        true
      );
      expect(webhookResponse.status).toBe(409);
      expect(webhookResponse.data.error).toBeDefined();
      expect(webhookResponse.data.error.code).toBe(EXPECTED_ERROR.code);
      expect(webhookResponse.data.error.description).toBe(EXPECTED_ERROR.description);
    }
  );
});
