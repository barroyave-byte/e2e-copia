import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as userData from '@support/interfaces/user_data';
import { SHIPPING_RATE_URLS } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Checkout Widget - Guest resolves shipping address using "Use my location"',
  { tag: ['@checkout_base', '@checkout', '@team_enterprise'] },
  () => {
    let publicKey: string;
    let privateKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      publicKey = merchant.publicKey;
      privateKey = merchant.privateKey;
    });

    test.beforeEach(async ({ context }) => {
      await context.grantPermissions(['local-network-access', 'geolocation']);
      await context.setGeolocation({ latitude: 19.4328, longitude: -99.1922 }); // Polanco, CDMX

      // Intercept the EMA order-creation request from the Explore storefront and
      // inject a shipping_rate webhook URL so the checkout widget can validate
      // geolocation-resolved addresses. Without it the widget has no URL to call
      // and every address surfaces "Dirección sin cobertura".
      await context.route('**/merchants/orders', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        const body = route.request().postDataJSON();
        if (!body?.order) {
          await route.continue();
          return;
        }
        await route.continue({
          postData: JSON.stringify({
            ...body,
            order: {
              ...body.order,
              webhook_urls: {
                ...(body.order.webhook_urls ?? {}),
                shipping_rate: SHIPPING_RATE_URLS.MEXICO,
              },
            },
          }),
        });
      });
    });

    test(
      '@ENTP1-T2589 Checkout Widget - Guest resolves shipping address using "Use my location"',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        // "Use my location" option is only rendered on mobile/tablet viewports
        await page.setViewportSize({ width: 390, height: 844 });
        const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'checkout.openCheckoutWidgetFromCatalog',
              params: { publicKey: publicKey, privateKey: privateKey },
            },
            {
              action: 'checkout.email.enterEmailAndContinue',
              params: { email: userEmail },
            },
            {
              action: 'checkout.userData.fillGuestUserData',
              params: userData.userDataMX,
            },
            { action: 'checkout.userData.selectAddressViaGeolocation' },
          ],
        });
      }
    );
  }
);
