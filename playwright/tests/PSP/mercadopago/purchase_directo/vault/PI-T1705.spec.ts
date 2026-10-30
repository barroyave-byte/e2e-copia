import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';

const configMerchant = new ConfigMerchant();

const userEmail = 'test@testuser.com';

test.describe('@regression usuario registrado realiza purchase exitoso con Mercado Pago.', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService }) => {
    const merchantConfig = await configMerchant.basicSetup('AR');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;

    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

    const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
      user_email: userEmail,
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorArgentina,
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

  test(
    '@PI-T1705 purchase con tarjeta tokenizada con Mercado Pago.',
    { tag: ['@vault', '@payments_integration', '@team_payment_integration', '@preprod'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);

      await test.step('The user enters the credit card information of the MercadoPago Visa', async () => {
        await vaultWidgetPage.fillFormVault(
          creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
          { country: 'AR' }
        );
      });

      await test.step('user click on pay', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      let cardID = '';

      await test.step('Validate card tokenization with Mercado Pago', async () => {
        cardID = await vaultWidgetPage.assertCardRequest(201);
      });

      await test.step('Validate successfully purchase and recurring payment with Mercado Pago', async () => {
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardID);
      });
    }
  );
});
