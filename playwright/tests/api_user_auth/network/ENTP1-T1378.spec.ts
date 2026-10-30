import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { RegisterUserRequest } from '@support/http/models/userAuth';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

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
    '@ENTP1-T1378 Network: Registrar Usuarios',
    { tag: ['@preprod', '@checkout_ui', '@user_auth', '@team_payments_capabilities'] },
    async ({ page }) => {
      const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      body_register_user.merchantPrivateKey = privateKey;
      body_register_user.merchantId = merchantId;
      await userAuthService.createNetworkAndAddMerchantToNetwork(merchantId, merchantToken);
      await userAuthService.registerUser(body_register_user);
    }
  );
});
