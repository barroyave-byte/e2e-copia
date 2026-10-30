import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const globalAssert = new GlobalAssert();
const configMerchantVault = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Compra Exitosa de Usuario Registrado no Autenticado: CDL inexistente pero Correo de orden SÍ existe en la subred y continua como invitado usando el Vault Widget',
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
      const merchant = await configMerchantVault.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey; // MX, CO, PE, CL or other
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.stripeVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.stripeVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
      );

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
      '@ENTP1-T1992 Compra Exitosa de Usuario Registrado no Autenticado: CDL inexistente pero Correo de orden SÍ existe en la subred y continua como invitado usando el Vault Widget',
      {
        tag: ['@smoke', '@team_enterprise'],
        annotation: {
          type: 'bug',
          description: 'ENTP1-10547',
        },
      },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('The user opts to proceed as a guest.', async () => {
          await vaultWidgetPage.clickOnContinueAsGuest();
        });

        await test.step('The user completes their card info. We verify that the user does not encounter tyc, and the payment button becomes enabled', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.stripeVisaSuccessful, {
            country: 'MX',
          });
          await vaultWidgetPage.assertUserDoesNotSeeTermsAndConditions();
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('The user clicks on the payment button.', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('It is validated that the card and purchase V2 request is sent', async () => {
          const cardId = await vaultWidgetPage.assertCardRequest();
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
          await page.waitForTimeout(1000);
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
