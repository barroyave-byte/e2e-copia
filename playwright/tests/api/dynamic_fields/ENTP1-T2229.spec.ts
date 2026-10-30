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
    '@ENTP1-T2229 Error al intentar crear un campo dinamico tipo component con propiedades con un type incorrecto',
    { tag: ['@preprod', '@checkout_ui', '@api', '@ema', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('Validate errors', async () => {
        const response = await checkoutConfigurationService.createCustomField(
          {
            field_name: 'component',
            placeholder: 'component',
            field_type: 'component',
            validation: { required: true },
            properties: [{ name: 'street', type: 'wrong type' }],
          },
          merchantId,
          merchantToken,
          true
        );
        expect(response.status).toBe(400);
        expect((response.data as any).error).toMatchObject({
          code: 'CHKCONFIG-1003',
          description:
            "Key: 'CreateCustomField.Properties[0].Type' Error:Field validation for 'Type' failed on the 'oneof' tag: string boolean integer number",
        });
      });
    }
  );
});
