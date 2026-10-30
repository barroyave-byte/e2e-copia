import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';
import { THEME_BASE_COLORS } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;

test.describe('@regression get all themes in checkout configurations', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ checkoutConfigurationService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    const response = await checkoutConfigurationService.createTheme(
      privateKey,
      themeName,
      THEME_BASE_COLORS
    );

    expect(response.status).toBe(200);
    console.log('theme_id ----> ' + (response.data as any).id);
  });

  test(
    '@PLAT-T1406 get all themes',
    { tag: ['@preprod', '@checkout_configuration', '@team_platform'] },
    async ({ page, checkoutConfigurationService }) => {
      await test.step('get all themes with successful result', async () => {
        const response = await checkoutConfigurationService.getAllThemes(privateKey);
        expect(response.status).toBe(200);
        expect((response.data as any).data.length).toBe(1);
      });
    }
  );
});
