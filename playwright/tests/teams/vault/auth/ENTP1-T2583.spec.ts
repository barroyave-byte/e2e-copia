import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { TestingFramework } from 'playwright/framework/core';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Elements (Vault): Card enrollment with authenticated user',
  { tag: ['@checkout', '@deuna-web-sdk', '@vault'] },
  () => {
    let userToken: string;

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;

    let publicKey: string;

    let orderToken: string;

    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const userEmail = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      const { user } = await userAuthService.registerUserAndSetAddress(
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
      userToken = user.token;

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.kushkiVisaSuccessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );
    });

    test.beforeEach(async ({ page }) => {
      const publicApiKey = publicKey;
      const lastFourDigitsSecondCard = `**** ${creditCardData.kushkiVisaSuccessfull.number.slice(-4)}`;

      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'checkout.websdk.goToHarness',
            stepName: 'Should go to the harness test app',
          },
          {
            action: 'checkout.websdk.init',
            params: { publicApiKey },
            stepName: 'Initialize WebSDK client',
          },
          {
            action: 'checkout.websdk.openElements',
            params: { orderToken, userToken },
            stepName: 'Should open the Payment Widget without card enrollment mode',
          },
          {
            action: 'checkout.vault.assertSavedCardIsVisible',
            params: { expectedCardNumbers: lastFourDigitsSecondCard },
            stepName: 'Should verify that the saved card is visible',
          },
        ],
      });
    });

    test(
      '@ENTP1-T2583 Elements (Vault): Card enrollment with authenticated user',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const publicApiKey = publicKey;

        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'checkout.websdk.goToHarness',
              stepName: 'Should go to the harness test app',
            },
            {
              action: 'checkout.websdk.init',
              params: { publicApiKey },
              stepName: 'Initialize WebSDK client',
            },
            {
              action: 'checkout.websdk.openElements',
              params: { orderToken, userToken, behavior: { onlyCardEnrollment: true } },
              stepName: 'Should open the Payment Widget with card enrollment mode',
            },
            {
              action: 'checkout.vault.fillCardForm',
              params: {
                creditCardData: creditCardData.mercadopagoVisaInstallments,
                options: { country: 'MX', avoidInstallmentsCall: true },
              },
              stepName: 'Should enter the card information',
            },
            {
              action: 'checkout.vault.clickOnSave',
              stepName: 'Should save the card',
            },
            {
              action: 'checkout.vault.assertEventWasFired',
              params: { event: 'vaultSaveSuccess' },
              stepName: 'Should verify that card has been created',
            },
          ],
        });
      }
    );
  }
);
