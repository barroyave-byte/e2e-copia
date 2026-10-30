import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import { BaseUserData } from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';

const configMerchant = new ConfigMerchant();

const userEmail = 'test@deuna.com';
const userData: BaseUserData = {
  name: 'Alejandro',
  last_name: 'Encarnación',
  phone: '+18097789809',
  dni: '123456789',
};

test.describe(
  '@regression Register user in private network',
  {
    tag: ['@preprod', '@authorization', '@api', '@user_auth', '@team_payments_capabilities'],
  },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      await apiCallNewman.createNetwork(merchantId, merchantToken);
    });

    test('@PI-T1703 Registro de usuario en red privada declinado por usuario ya existente', async () => {
      await test.step('The merchant registers an user in their network', async () => {
        await apiCallNewman.registerUser(
          userEmail,
          userData,
          validationUser.successUser,
          privateKey,
          merchantId
        );
      });

      await test.step('Validates error when merchant tries to register same user in their network', async () => {
        await apiCallNewman.registerUser(
          userEmail,
          userData,
          validationUser.errorUserAlreadyExists,
          privateKey,
          merchantId
        );
      });
    });
  }
);
