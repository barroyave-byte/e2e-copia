import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: false,
    },
  },
  elementsConfig: {
    init_with_guest_user: true,
    user_authentication_flow: false,
  },
};

test.describe(
  '@regression Usuario Guest',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMCI('MXN', merchantId, merchantToken);

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2282 Auth (2): Usuario Guest - show_save_card_flow = false',
      { tag: ['@smoke', '@auth', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill in new card details', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.kushkiVisaSuccessfull, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
        });

        await test.step('User selects Pay', async () => {
          await vaultWidgetPage.clickOnPay({ withSuccessAssertion: true });
        });
        await test.step('It is validated that the card and purchase V2 request is sent', async () => {
          const cardId = await vaultWidgetPage.assertCardRequest();
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
        });
      }
    );
  }
);
