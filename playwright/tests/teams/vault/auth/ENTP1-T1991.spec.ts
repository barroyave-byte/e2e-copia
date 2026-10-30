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
import * as userData from '@support/interfaces/user_data';
import { ModalExperienceTypePage } from '@pages/explore/modalExperienceTypePage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const userSecondEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Compra Exitosa de Usuario Registrado no Autenticado: CDL y Correo de orden existente en la subred difieren usando el Vault Widget',
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
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.globalpayVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.globalpayVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
          user_email: userEmail,
          amount: 250000,
        })
      ).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
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

    test.fixme(
      '@ENTP1-T1991 Compra Exitosa de Usuario Registrado no Autenticado: CDL y Correo de orden existente en la subred difieren usando el Vault Widget',
      {
        tag: ['@smoke', '@team_enterprise'],
        annotation: {
          type: 'bug',
          description: 'ENTP1-10547',
        },
      },

      async ({ page, emaService, userAuthService }) => {
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

        await userAuthService.registerUserAndSetAddress(
          {
            email: userSecondEmail,
            phone: userAddressCreditCard.userAddressCreditCardMX.phone,
            identity_document: creditCardData.globalpayVisaSuccessful.document_number,
          },
          {
            merchantId,
            merchantPrivateKey: privateKey,
          }
        );

        await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

        const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
          user_email: userSecondEmail,
          amount: 250000,
        });
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;

        await apiCallNewman.createPaymentProcessor(
          processorsConfig.globalpayProcessor,
          merchantId,
          merchantToken
        );

        await apiCallNewman.setCreditCardForUserInNetwork(
          userSecondEmail,
          creditCardData.globalpayVisaSuccessful,
          userAddressCreditCard.userAddressCreditCardMX,
          userData.userDataCO,
          privateKey
        );

        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        const modalExperienceTypePage = new ModalExperienceTypePage(page);

        await test.step('Open Widget & Close session', async () => {
          await page.waitForTimeout(1000);
          const { sessionId, deviceId } = await vaultWidgetPage.getSessionCredentials();
          const sessionToken = await userAuthService.loginWithDeviceFingerprint(
            deviceId,
            sessionId
          );
          await userAuthService.logout(sessionToken, sessionId);
        });

        await test.step('Reopen widget', async () => {
          await vaultWidgetPage.enterOtpCode();
          await page.waitForTimeout(7000);
          await modalExperienceTypePage.reopenVaultWidget();
        });

        await test.step('Fills out CVV', async () => {
          await vaultWidgetPage.fillCvvInCardForm(creditCardData.globalpayVisaSuccessful.cvv_code);
          await vaultWidgetPage.assertUserDoesNotSeeTermsAndConditions();
        });
        await test.step('User selects Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('Validate card and purchase V2 request is sent', async () => {
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200);
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
