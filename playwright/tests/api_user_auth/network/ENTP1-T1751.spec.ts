import { expect, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { CreateNetworkRequest } from '@support/http/models/userAuth';

const configMerchantCheckout = new ConfigMerchantCheckout();
const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
let networkId: string;

test.describe('@regression Network', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@ENTP1-T1751 Network: Creacion de SubredPrivate',
    { tag: ['@preprod', '@checkout_ui', '@user_auth', '@team_payments_capabilities'] },
    async ({ page }) => {
      await test.step('Create basic merchant', async () => {
        const merchant = await configMerchantCheckout.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
      });

      await test.step('Create Subred Private', async () => {
        const createNetworkRequest: CreateNetworkRequest = {
          data: { name: `network_${crypto.randomUUID()}`, is_private: true },
          merchantToken: merchantToken,
        };
        const networkResponse = await userAuthService.createNetwork(createNetworkRequest);
        networkId = networkResponse.id;
      });

      await test.step('get network', async () => {
        const networkResponse = await userAuthService.getNetwork(networkId, merchantToken);
        expect(networkResponse.status).toBe(200);
      });
    }
  );
});
