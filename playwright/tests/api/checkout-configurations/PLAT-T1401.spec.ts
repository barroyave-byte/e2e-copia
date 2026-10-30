import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;

test.describe('@regression error creating theme in checkout configurations', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@PLAT-T1401 error creating theme  ',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('create theme with error result', async () => {
        const response = await checkoutConfigurationService.createTheme(
          privateKey,
          themeName,
          undefined,
          true
        );

        expect(response.status).toBe(400);
        expect((response.data as any).error.code).toEqual('CHKCONFIG-1003');
        expect((response.data as any).error.description).toEqual(
          `Key: 'CreateTheme.Config' Error:Field validation for 'Config' failed on the 'required' tag`
        );
      });
    }
  );
});
