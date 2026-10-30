import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
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
            required: true,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const amountCard1 = '1800';
const totalRenewAmount = 180000;
const totalAmount = 250000;
const totalAmountWithInstallments = 83333;
const totalRenewAmountWithInstallments = 60000;
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Flujo Split Payments -  Usuario autenticado compra con cuotas de pago correctas asociadas al monto dividido',
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
      const merchant = await configMerchant.basicSetup('CO');
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
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
      '@ENTP1-T2304 Flujo Split Payments - Usuario autenticado compra con cuotas de pago correctas asociadas al monto dividido',
      { tag: ['@smoke', '@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const expectedFirstBin = creditCardData.mercadoPagoVisaCardSuccessful.number
          .slice(0, 6)
          .toString();

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        // Register before clicking — the widget auto-selects card 1 and fires the
        // installments request immediately on load; registering after the click risks
        // missing the response and timing out in assertInstallmentsData.
        vaultWidgetPage.waitForInstallmentsResponse(expectedFirstBin);
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();

          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');

          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('User sees correct installments in Single Payment flow', async () => {
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
          await vaultWidgetPage.assertInstallmentsData(3, totalAmount, totalAmountWithInstallments);
        });
        await test.step('User goes to Split Payments and Installments are recalculated', async () => {
          vaultWidgetPage.waitForInstallmentsResponse(expectedFirstBin);
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertInstallmentsData(3, undefined, undefined);
        });

        await test.step('User adjust amount 0 for card 1 and installments call must not run', async () => {
          const installmentsTracker = vaultWidgetPage.expectInstallmentsNotEmitted();

          await vaultWidgetPage.adjustCardAmount(1, '0');
          await vaultWidgetPage.assertInstallmentsFieldsByCardIndexIsHidden(1);

          installmentsTracker.verify();
        });

        await test.step('User adjust amount for card 1', async () => {
          await vaultWidgetPage.adjustCardAmount(1, amountCard1);

          vaultWidgetPage.waitForInstallmentsResponse(
            expectedFirstBin,
            (parseInt(amountCard1) * 100).toString()
          );

          await vaultWidgetPage.assertInstallmentsData(
            3,
            totalRenewAmount,
            totalRenewAmountWithInstallments
          );
        });
        await test.step('User select MSI', async () => {
          await vaultWidgetPage.selectInstallmentsMSI('3');
        });

        await test.step('The user does not see installments on the second card due to the amount', async () => {
          const expectedSecondBin = creditCardData.mercadoPagoVisaCardTokenizationSuccessful.number
            .slice(0, 6)
            .toString();
          // await the installments response from performAutoSelection
          // before filling CVV. avoidInstallmentsCall=false in fillCvvInCardForm does NOT
          // block — it only sets up a listener without awaiting it. We must use
          // assertInstallmentsData to actually wait for the response before filling CVV.
          // Without this guard the race condition in useSelectedCardIdSync discards the CVV
          // (isAutoSelectingRef=true blocks the sync effect while the fetch is in-flight).
          vaultWidgetPage.waitForInstallmentsResponse(expectedSecondBin);
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.assertInstallmentsData(3, undefined, undefined);

          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
        });

        await test.step('Verify order information and assert event vaultSaveSuccess was fired', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          await eventPromise;
        });
      }
    );
  }
);
