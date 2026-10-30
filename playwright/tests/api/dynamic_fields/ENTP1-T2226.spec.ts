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
    '@ENTP1-T2226 Error al crear un custom field type component y el nombre de la propiedad con espacios',
    { tag: ['@preprod', '@checkout_ui', '@api', '@ema', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('Validate errors', async () => {
        const response = await checkoutConfigurationService.createCustomField(
          {
            field_name: 'component',
            placeholder: 'component',
            field_type: 'component',
            validation: { required: true },
            properties: [{ name: 'street 1', type: 'string' }],
          },
          merchantId,
          merchantToken,
          true
        );
        expect(response.status).toBe(400);
        expect((response.data as any).error).toMatchObject({
          code: 'CHKCONFIG-1003',
          description:
            "Key: 'CreateCustomField.Properties[0].Name' Error:Field validation for 'Name' failed on the 'alphanum_underscore' tag: must be an alphanumeric string and contain '-','_'",
        });
      });
    }
  );
});
