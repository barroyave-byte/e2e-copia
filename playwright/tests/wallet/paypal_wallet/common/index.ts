import { test } from '@playwright/test';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { ProcessorRegistry } from '@support/utils/ProcessorRegistry';
import { IInitParams } from './interfaces';

export const paypalAccount = {
  email: 'sb-ifa43a33533437@personal.example.com',
  password: 'ynZ3%>]-',
};
export const paypalAccountDeclined = {
  email: 'paypal.sbx.declines@deuna.com',
  password: 'DunaPayPal@25',
};

export const init = async (params?: IInitParams) => {
  const configMerchantCheckout = new ConfigMerchantCheckout();

  const { merchantId, merchantToken, publicKey, privateKey } =
    await configMerchantCheckout.basicSetup('MX');
  const processorConfig = params?.withInstallments
    ? processorsConfig.paypalWalletProcessorWithInstallments
    : processorsConfig.paypalWalletProcessor;

  const processorId: string = await apiCallNewman.createPaymentProcessor(
    processorConfig,
    merchantId,
    merchantToken
  );

  if (params?.withAditionalProcessor) {
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cashProcessor,
      merchantId,
      merchantToken
    );
  }

  return { processorId, merchantId, merchantToken, publicKey, privateKey };
};

export const registerUserWithAddress = async (
  userEmail: string,
  merchantId: string,
  privateKey: string
) => {
  const userAuthService = ServiceFactory.getService(SERVICE_KEYS.USER_AUTH);
  await userAuthService.registerUserAndSetAddress(
    {
      email: userEmail,
      phone: userAddressCreditCard.userAddressCreditCardMX.phone,
      identity_document: creditCardData.kushkiVisaSuccessfull.document_number,
    },
    {
      merchantId,
      merchantPrivateKey: privateKey,
    }
  );
};

export const setCardToUser = async (userEmail: string, merchantId: string, privateKey: string) => {
  await apiCallNewman.setCreditCardForUser(
    userEmail,
    creditCardData.kushkiVisaSuccessfull,
    userAddressCreditCard.userAddressCreditCardMX,
    merchantId,
    privateKey
  );
};

export const setUserToken = async (
  userEmail: string,
  merchantId: string,
  privateKey: string
): Promise<string> => {
  const configAuth = new ConfigAuth();
  return await configAuth.setUserToken(userEmail, merchantId, privateKey);
};

export const registerProcessorForCleanup = (
  processorId: string,
  merchantId: string,
  merchantToken: string
) => {
  if (!processorId) return;
  ProcessorRegistry.getInstance().register(processorId, merchantId, merchantToken);

  try {
    test.info().annotations.push({
      type: 'processor-cleanup',
      description: JSON.stringify({ processorId, merchantId, merchantToken }),
    });
  } catch (error) {
    console.warn('[PAYPAL WALLET] Failed to register processor for cleanup via annotation:', error);
  }
};

export const deletePaymentProcessor = async (
  processorId: string,
  merchantId: string,
  merchantToken: string
) => {
  if (!processorId) return;
  try {
    await ServiceFactory.getService(SERVICE_KEYS.PAYMENT).deletePaymentProcessor(
      processorId,
      merchantId,
      merchantToken
    );
    ProcessorRegistry.getInstance().unregister(processorId);
  } catch (error) {
    console.warn(
      `[PAYPAL WALLET] deletePaymentProcessor(${processorId}) failed — will be retried in globalTeardown:`,
      error
    );
  }
};
