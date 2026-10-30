import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';
import { THEME_BASE_COLORS } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;
var themeId = '';

test.describe('@regression update theme in checkout configurations', () => {
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
    themeId = (response.data as any).id;
    console.log('theme_id ----> ' + themeId);
  });

  test(
    '@PLAT-T1402 update theme',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('update theme with successful result', async () => {
        const response = await checkoutConfigurationService.updateTheme(
          privateKey,
          themeId,
          'Godzilla_Theme',
          {
            theme: {
              mainColor: '#19323C',
              secondaryColor: '#000000',
              information400: '#ffffff',
              notificationInfoBackground: '#F2545B',
            },
          }
        );

        expect(response.status).toBe(200);
        expect((response.data as any).name).toEqual('Godzilla_Theme');
        expect(JSON.stringify((response.data as any).config)).toEqual(
          '{"theme":{"information400":"#ffffff","mainColor":"#19323C","notificationInfoBackground":"#F2545B","secondaryColor":"#000000"}}'
        );
      });
    }
  );
});
