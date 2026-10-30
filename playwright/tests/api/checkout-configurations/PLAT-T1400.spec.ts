import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';
import { THEME_FULL_CONFIG } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;

test.describe('@regression create theme in checkout configurations', () => {
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
    '@PLAT-T1400 create theme',
    {
      tag: [
        '@preprod',
        '@checkout_configuration',
        '@api',
        '@checkout_configurations',
        '@team_platform',
      ],
    },
    async ({ checkoutConfigurationService }) => {
      await test.step('create theme with successful result', async () => {
        const response = await checkoutConfigurationService.createTheme(
          privateKey,
          themeName,
          THEME_FULL_CONFIG
        );

        expect(response.status).toBe(200);
        expect((response.data as any).name).toEqual(themeName);
        console.log('theme_id ----> ' + (response.data as any).id);
      });
    }
  );
});
