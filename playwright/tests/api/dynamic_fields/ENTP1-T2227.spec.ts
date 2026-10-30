import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { faker } from '@faker-js/faker';

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
    '@ENTP1-T2227 Crear un custom field de tipo component exitosamente con sus propiedades',
    { tag: ['@preprod', '@checkout_ui', '@api', '@ema', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('Validate errors', async () => {
        const response = await checkoutConfigurationService.createCustomField(
          {
            field_name: `field_${faker.string.uuid()}`,
            placeholder: 'address',
            field_type: 'component',
            validation: { required: true },
            properties: [
              { name: 'street', type: 'string', required: true },
              { name: 'city', type: 'string', required: true },
              { name: 'country', type: 'string', required: true },
            ],
          },
          merchantId,
          merchantToken
        );
        const data = response.data as any;
        expect(data.active).toBe(true);
        expect(data.data_type).toBe('object');
        expect(data.field_type).toBe('component');
        expect(data.properties).toHaveLength(3);
      });
    }
  );
});
