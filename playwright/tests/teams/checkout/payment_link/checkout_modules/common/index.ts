import * as processorsConfig from '@support/interfaces/payment_processors';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const userName = 'John';
const userLastName = 'Doe';
let configMerchant: any;

export const init = async (): Promise<{
  merchantId: string;
  publicKey: string;
  privateKey: string;
}> => {
  const configMerchantCheckout = new ConfigMerchantCheckout();
  configMerchant = await configMerchantCheckout.basicSetup('BR');
  await apiCallNewman.createPaymentProcessor(
    processorsConfig.pagbankProcessor,
    configMerchant.merchantId,
    configMerchant.merchantToken
  );
  return {
    merchantId: configMerchant.merchantId,
    publicKey: configMerchant.publicKey,
    privateKey: configMerchant.privateKey,
  };
};

export const registerUser = async () => {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  await userAuthService.registerUserAndSetAddress(
    {
      email: userEmail,
      phone: userAddressCreditCard.userAddressCreditCardBR.phone,
      identity_document: creditCardData.pagbankMasterCardSucessful.document_number,
    },
    {
      merchantId: configMerchant.merchantId,
      merchantPrivateKey: configMerchant.privateKey,
    }
  );
};

export const setCreditCard = async () => {
  await apiCallNewman.setCreditCardForUser(
    userEmail,
    creditCardData.pagbankMasterCardSucessful,
    userAddressCreditCard.userAddressCreditCardBR,
    configMerchant.merchantId,
    configMerchant.privateKey
  );
};

export const setElementsConfig = async (
  init_with_guest_user: boolean,
  user_authentication_flow: boolean,
  merchantId: string = configMerchant?.merchantId,
  merchantToken: string = configMerchant?.merchantToken
) => {
  if (!merchantId || !merchantToken) {
    throw new Error(
      'setElementsConfig: no merchantId/merchantToken available. Pass them explicitly or call init() first.'
    );
  }

  const checkoutConfigurationService = ServiceFactory.getService(
    SERVICE_KEYS.CHECKOUT_CONFIGURATION
  );
  await checkoutConfigurationService.createConfigCheckoutV2({
    merchant_token: merchantToken,
    merchant_id: merchantId,
    config_checkout_v2_data: {
      order_config: { notify_type: 'async' } as any,
      elements_config: { init_with_guest_user, user_authentication_flow },
    },
  });
};

export const tokenizeOrder = async (): Promise<string> => {
  const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
  const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
    configMerchant.privateKey,
    DeunaPaymentLinkOrderBuilder.createBody({
      user_email: userEmail,
      amount: 5200000,
      country: 'BR',
      first_name: userName,
      last_name: userLastName,
      address: userAddressCreditCard.userAddressCreditCardBR.address1,
      zipcode: userAddressCreditCard.userAddressCreditCardBR.zip,
      city: userAddressCreditCard.userAddressCreditCardBR.city,
      state_name: userAddressCreditCard.userAddressCreditCardBR.state,
      country_code: userAddressCreditCard.userAddressCreditCardBR.country,
      identity_document: creditCardData.pagbankMasterCardSucessful.document_number,
      identity_document_type: 'CPF',
      phone: userAddressCreditCard.userAddressCreditCardBR.phone,
      checkout_modules: [
        { name: 'LoginWithEmailOrderPattern' },
        { name: 'UserInfoPattern' },
        {
          name: 'OrderDetailPattern',
          props: {
            fields: [{ name: 'taxes' }, { name: 'discount' }, { name: 'shipping' }],
          },
        },
      ],
    })
  );
  return tokenized.data.token;
};

export const getUserInfo = () => ({
  email: userEmail,
  name: userName,
  lastName: userLastName,
  phone: userAddressCreditCard.userAddressCreditCardBR.phone,
});
