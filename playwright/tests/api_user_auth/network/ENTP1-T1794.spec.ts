import { EmailGenerator } from '@support/utils/EmailGenerator';
import { expect, test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { RegisterUserRequest, RegisterUserResponse } from '@support/http/models/userAuth';

const configMerchantCheckout = new ConfigMerchantCheckout();
const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
let networkId: string;

const body_register_user: RegisterUserRequest = {
  merchantPrivateKey: '',
  merchantId: '',
  data: {
    email: EmailGenerator.generatePayerEmail(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    phone: `+57${faker.string.numeric(10)}`,
    identity_document: faker.string.numeric(9),
  },
};

test.describe('@regression Network', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@ENTP1-T1794 Network: Validar que usuario sea Private',
    { tag: ['@preprod', '@checkout_ui', '@user_auth', '@team_payments_capabilities'] },
    async ({ page }) => {
      let tokenUser: string;
      await test.step('Create basic merchant', async () => {
        const merchant = await configMerchantCheckout.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
      });

      await test.step('Create Subred Private and Add Merchant to Network', async () => {
        const createNetworkResponse = await userAuthService.createNetworkAndAddMerchantToNetwork(
          merchantId,
          merchantToken
        );
        networkId = createNetworkResponse.network_id;
      });

      await test.step('get network', async () => {
        const networkResponse = await userAuthService.getNetwork(networkId, merchantToken);
        expect(networkResponse.status).toBe(200);
      });

      await test.step('Register User', async () => {
        body_register_user.merchantPrivateKey = privateKey;
        body_register_user.merchantId = merchantId;
        tokenUser = (await userAuthService.registerUser(body_register_user)).data.token;
      });

      await test.step('get user', async () => {
        const userResponse = await userAuthService.getUser(privateKey, tokenUser);
        console.log(userResponse);
        expect(userResponse.status).toBe(200);
      });
    }
  );
});
