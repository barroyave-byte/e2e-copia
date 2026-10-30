import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { USE_PSP_TOKENIZATION_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();

const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

test.describe('@regression purchase exitoso con tarjeta tokenizada por MercadoPago y verificada por Zero dollar auth', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.mercadoPagoVisaCardTokenizationSuccessful.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

    await paymentService.createConfigMerchantPayments(
      USE_PSP_TOKENIZATION_ENABLED,
      merchantId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
      user_email: userEmail,
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoWithTokenizationProcessor,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test.fixme(
    '@PI-T1368 purchase con tarjeta tokenizada con MercadoPago y verificada por Zero dollar auth',
    {
      tag: ['@vault', '@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-4072' },
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);

      await test.step('The user enters the credit card information of the MercadoPago Visa', async () => {
        await vaultWidgetPage.fillFormVault(
          creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
          { avoidInstallmentsCall: true, country: 'AR' }
        );
      });

      await test.step('user click on pay', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      let cardID = '';

      await test.step('Validate card tokenization with MercadoPago', async () => {
        cardID = await vaultWidgetPage.assertCardVerifiedRequest(
          201,
          'mercadopago_zero_dollar_auth'
        );
      });

      await test.step('Validate successfully purchase and recurring payment with MercadoPago', async () => {
        let responsePurchase = await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(
          'processed',
          200,
          cardID
        );

        await vaultWidgetPage.assertPurchaseWithTokenizedCardMercadoPago(
          responsePurchase.order.payment.data.external_transaction_id,
          processorsConfig.mercadoPagoWithTokenizationProcessor.private_api_key
        );
      });
    }
  );
});
