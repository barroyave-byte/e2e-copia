import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { ModalExperienceTypePage } from '@pages/explore/modalExperienceTypePage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Compra Exitosa de Usuario Autenticado: con tarjeta nueva e installments usando el Vault Widget',
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

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.globalpayVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
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
      '@ENTP1-T1990 Compra Exitosa de Usuario Autenticado: con tarjeta nueva e installments usando el Vault Widget',
      {
        tag: ['@smoke', '@installments', '@team_enterprise'],
        annotation: {
          type: 'bug',
          description: 'ENTP1-10547',
        },
      },
      async ({ page, userAuthService }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const modalExperienceTypePage = new ModalExperienceTypePage(page);
        const installments = '3';

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

        await test.step('user click on add new card', async () => {
          await vaultWidgetPage.clickAddCard(creditCardData.globalpayVisaSuccessful);
          await vaultWidgetPage.assertUserDoesNotSeeTermsAndConditions();
        });
        await test.step('User select MSI', async () => {
          await vaultWidgetPage.selectInstallmentsMSI(installments);
        });
        await test.step('User select Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('It is validated that the card and purchase V2 request is sent', async () => {
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200);
        });
      }
    );
  }
);
