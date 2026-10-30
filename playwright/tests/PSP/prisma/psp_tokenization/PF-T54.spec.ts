import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { USE_PSP_TOKENIZATION_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generatePayerEmail();

test.describe('@regression purchase exitoso con tarjeta tokenizada por Prisma/Payway y verificada por minimum amount', () => {
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
        identity_document: creditCardData.prismaPaywayVisaSuccessful.document_number,
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
      processorsConfig.prismaPaywayProcessorTokenization,
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
    '@PF-T54 purchase con tarjeta tokenizada con Prisma/Payway y verificada por minimum amount',
    { tag: ['@vault', '@payments_integration', '@team_payconnect'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user enters the credit card information of the Prisma/Payway', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.prismaPaywayVisaSuccessful, {
          country: 'AR',
        });
      });

      await test.step('user click on pay', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      let cardID = '';

      await test.step('Validate card tokenization with Prisma/Payway', async () => {
        cardID = await vaultWidgetPage.assertCardVerifiedRequest(
          201,
          'prisma_payway_minimum_amount'
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        // Validate that the request /purchase sent from the UI is correct.
        const status = 'processed';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(status, 200, cardID);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
