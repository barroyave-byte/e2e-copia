import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'state_name',
          validation: {
            required: false,
          },
        },
        {
          name: 'city',
          validation: {
            required: false,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const amountCard1 = '1000.00';
const finalAmountCard2 = '1,500.00';
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Flujo Split Payments -  Usuario Autenticado con 2 o más tarjetas guardadas ',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
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
      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          withSplitPayment: true,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2339 Split Payments - sin billing diligenciado (Events)',
      { tag: ['@smoke', '@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const vaultWidgetPage = new VaultWidgetPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        await Promise.all([vaultWidgetPage.assertEventWasFired('billingSet')]);

        await test.step('Fill card 1 in card', async () => {
          await Promise.all([
            vaultWidgetPage.assertEventWasFired('billingSet'),
            vaultWidgetPage.clickPayWithTwoCards(),
          ]);
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
        });

        await test.step('Fill card 2 in card form and check billing events', async () => {
          await Promise.all([
            vaultWidgetPage.assertEventWasFired('billingSet'),
            vaultWidgetPage.clickContinueWithCard2(),
          ]);
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
          await Promise.all([
            vaultWidgetPage.assertEventWasFired('billingChange'),
            vaultWidgetPage.clickCheckboxBillingPattern(),
          ]);

          await Promise.all([
            vaultWidgetPage.assertEventWasFired('billingFormSave'),
            paymentDeunaNowPage.clickToSaveFormButton(),
          ]);
          await vaultWidgetPage.assertAdjustAmountForCard2(finalAmountCard2);
        });

        await test.step('Assert event vaultSaveSuccess was fired', async () => {
          const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          await eventPromise;
        });
      }
    );
  }
);
