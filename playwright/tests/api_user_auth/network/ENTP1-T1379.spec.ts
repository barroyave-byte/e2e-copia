import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { RegisterUserRequest } from '@support/http/models/userAuth';
import { expect } from '@support/fixtures';

const configMerchantCheckout = new ConfigMerchantCheckout();

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
    '@ENTP1-T1379 Network: Eliminar Usuario',
    { tag: ['@preprod', '@checkout_ui', '@user_auth', '@team_payments_capabilities'] },
    async ({ page }) => {
      const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      let merchantNetwork;
      let registerUserResponse;

      await test.step('Create Network Subred Privada and Add Merchant', async () => {
        merchantNetwork = await userAuthService.createNetworkAndAddMerchantToNetwork(
          merchantId,
          merchantToken
        );
      });

      await test.step('Register User', async () => {
        body_register_user.merchantPrivateKey = privateKey;
        body_register_user.merchantId = merchantId;
        registerUserResponse = await userAuthService.registerUser(body_register_user);
      });

      await test.step('Validate delete User and Network', async () => {
        await userAuthService.deleteUser(
          registerUserResponse.data.user_id,
          registerUserResponse.data.token
        );
        const deleteUserResponse = await userAuthService.deleteUser(
          registerUserResponse.data.user_id,
          registerUserResponse.data.token,
          true
        );
        await userAuthService.deleteMerchantFromNetwork(
          merchantNetwork.network_id,
          merchantId,
          merchantToken
        );
        const deleteNetworkResponse = await userAuthService.deleteNetwork(
          merchantNetwork.network_id,
          merchantToken
        );
        expect(deleteUserResponse).toBe(404);
        expect(deleteNetworkResponse.status).toBe(204);
      });
    }
  );
});
