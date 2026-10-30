import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Compra Exitosa de Usuario Nuevo: Autenticado por CDL pero Correo de orden inexistente en la subred usando el Vault Widget',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('BR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardBR.phone,
          identity_document: creditCardData.cieloVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.cieloVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardBR,
        merchantId,
        privateKey
      );

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
          user_email: userEmail,
          amount: 250000,
        })
      ).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cieloProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T1985 Compra Exitosa de Usuario Nuevo: Autenticado por CDL pero Correo de orden inexistente en la subred usando el Vault Widget',
      { tag: ['@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page, emaService }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('User logs in', async () => {
          await paymentDeunaNowPage.enterOTPCode();
        });

        const configMerchantVaultforVault = new ConfigMerchant();

        const merchant = await configMerchantVaultforVault.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        publicKey = merchant.publicKey;

        await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          user_email: userEmail,
        });
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripeProcessor,
          merchantId,
          merchantToken
        );

        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('Validate user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.assertUserSeeTermsAndConditions();
        });

        await test.step('Fill out the credit card form and save', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.stripeVisaSuccessful, {
            country: 'MX',
          });
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('User selects Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('Validate card and purchase V2 request is sent', async () => {
          const cardId = await vaultWidgetPage.assertCardRequest();
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
