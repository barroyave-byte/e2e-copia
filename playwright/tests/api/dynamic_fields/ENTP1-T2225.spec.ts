import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();
let merchantId: string;
let merchantName: string;
let privateKey: string;
let merchantToken: string;

test.describe('@regression Dynamic Fields', () => {
  test.beforeAll(async () => {
    const setup = await configMerchant.basicSetup('MX');
    merchantName = setup.merchantName;
    privateKey = setup.privateKey;
    merchantId = setup.merchantId;
    merchantToken = setup.merchantToken;
  });

  test(
    '@ENTP1-T2225 Validar error al momento de intentar crear un custom field de tipo component sin ninguna property',
    { tag: ['@preprod', '@checkout_ui', '@api', '@ema', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('Validate errors', async () => {
        const response = await checkoutConfigurationService.createCustomField(
          {
            field_name: 'component',
            placeholder: 'component',
            field_type: 'component',
            validation: { required: true },
            properties: [],
          },
          merchantId,
          merchantToken,
          true
        );
        expect(response.status).toBe(409);
        expect((response.data as any).error).toMatchObject({
          code: 'CHKCONFIG-4000',
          description: 'error creating field component: properties cannot be empty',
        });
      });
    }
  );
});
