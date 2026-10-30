import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { USE_PSP_TOKENIZATION_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();
let orderToken: string;

const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;
var userID = '';
var userToken = '';
let privateKey = '';
let merchantId = '';
let merchantToken = '';
let merchantName: string;
let orderId: string;

var methodType = 'credit_card';
var processorName = 'kushki';

const testCreditCard = creditCardData.kushkiVisaInvalidTokenization;

test.describe('@regression error en tokenización de tarjeta con Kushki', () => {
  test.beforeAll(async ({ emaService, userAuthService, paymentService }) => {
    const responseMerchant = await configMerchant.basicSetup('PE');
    merchantName = responseMerchant.merchantName;
    privateKey = responseMerchant.privateKey;
    merchantId = responseMerchant.merchantId;
    merchantToken = responseMerchant.merchantToken;

    const response = await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardPE.phone,
        identity_document: testCreditCard.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    userID = response.user.user_id;
    userToken = response.user.token;

    await paymentService.createConfigMerchantPayments(
      USE_PSP_TOKENIZATION_ENABLED,
      merchantId,
      merchantToken
    );

    const result = await emaService.tokenizeDeunaNowOrder('PE', privateKey, {
      user_email: userEmail,
      amount: 250000,
    });
    orderId = result.data.order.order_id;
    orderToken = result.data.token;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorTokenizationPE,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1594 error en tokenización de tarjeta con Kushki',
    {
      tag: [
        '@api',
        '@smoke',
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
      ],
    },
    async () => {
      let cardID: any = '';

      await test.step('create card successfully, but it is not tokenized with kushki', async () => {
        let responseCard = await apiCallNewman.addCardToUserID(
          userID,
          userToken,
          testCreditCard,
          userAddressCreditCard.userAddressCreditCardPE,
          userEmail,
          userData.userDataPE
        );

        // assert of created status code
        expect(responseCard.status).toBe(201);

        cardID = responseCard.data.id;

        // assert of valid card id
        expect(cardID).not.toBe(null);
        expect(cardID).not.toBe('');

        // assert of error on kushki psp card tokenization
        expect(responseCard.data.vault).toBe(null);
      });

      await test.step('purchase v2 with tokenized card', async () => {
        await apiCallNewman.makePurchaseV1WithCardID(
          privateKey,
          merchantId,
          orderToken,
          cardID,
          userEmail,
          userToken,
          methodType,
          processorName
        );
      });
    }
  );
});
