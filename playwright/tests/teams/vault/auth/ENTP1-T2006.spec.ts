import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression payment vault con user token',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService, userAuthService }) => {
      const merchantSetup = await configMerchant.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

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

      await checkoutConfigurationService.configVaultWow(merchantId, merchantToken);

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
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2006 show error when vault has invalid user token when required',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('generic error for wrong token is shown', async () => {
          await vaultWidgetPage.genericErrorPageIsShown();
        });
      }
    );
  }
);
