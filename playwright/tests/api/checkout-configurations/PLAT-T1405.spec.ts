import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;

test.describe('@regression error deleting theme in checkout configurations', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test.fixme(
    '@PLAT-T1405 error deleting theme  ',
    {
      tag: ['@team_platform'],
      annotation: { type: 'bug', description: 'PI-4035' },
    },
    async ({ checkoutConfigurationService }) => {
      await test.step('delete theme with error result', async () => {
        const response = await checkoutConfigurationService.deleteTheme(
          privateKey,
          '9ec2f66c-c547-11ee-89ce-0a58a9feac04',
          true
        );

        expect(response.status).toBe(409);
        expect((response.data as any).error.code).toEqual('CHKCONFIG-4306');
        expect((response.data as any).error.description).toEqual(
          'checkout configuration not found'
        );
      });
    }
  );
});
