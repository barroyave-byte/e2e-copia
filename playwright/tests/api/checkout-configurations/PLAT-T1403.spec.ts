import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const themeName = `theme_${crypto.randomUUID()}`;

test.describe('@regression error updating theme in checkout configurations', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ checkoutConfigurationService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    const response = await checkoutConfigurationService.createTheme(privateKey, themeName, {
      theme: {
        colors: {
          primaryTextColor: '#323237',
          backgroundSecondary: '#FFFFFF',
          backgroundPrimary: '#FFFFFF',
          buttonPrimaryFill: '#17171A',
          buttonPrimaryHover: '#69696E',
          buttonPrimaryText: '#FFFFFF',
          buttonPrimaryActive: '#5F529E',
        },
      },
    });

    expect(response.status).toBe(200);
  });

  test(
    '@PLAT-T1403 error updating theme  ',
    { tag: ['@preprod', '@checkout_configuration', '@api', '@team_platform'] },
    async ({ checkoutConfigurationService }) => {
      await test.step('update theme with error result', async () => {
        const response = await checkoutConfigurationService.updateTheme(
          privateKey,
          '9ec2f66c-c547-11ee-89ce-0a58a9feac04',
          themeName,
          undefined,
          true
        );

        expect(response.status).toBe(409);
        expect((response.data as any).error.code).toEqual('CHKCONFIG-4307');
        expect((response.data as any).error.description).toEqual(
          'theme with ID 9ec2f66c-c547-11ee-89ce-0a58a9feac04 not found'
        );
      });
    }
  );
});
