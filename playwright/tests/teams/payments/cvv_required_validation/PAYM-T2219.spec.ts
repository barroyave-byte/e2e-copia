import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { EcommercePage } from '@pages/explore/ecommercePage';

const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

const configMerchant = new ConfigMerchant();
const configStatsig = new ConfigStatsig();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

let statsigRuleID: string;

test.describe('@regression Handle CVV required', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ userAuthService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    statsigRuleID = await configStatsig.addMerchantIDToUniqueFeatureGateRule(
      merchantId,
      FlagNames.ShouldHandleCvvRequired,
      RuleNames.MerchantsThatDontRequireCVVOnPurchaseTests,
      '100'
    );

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorExcludeCVV,
      merchantId,
      merchantToken
    );

    await userAuthService.registerUserAndSetAddress(
      {
        email: userEmail,
        phone: userAddressCreditCard.userAddressCreditCardMX.phone,
        identity_document: creditCardData.mercadopagoMasterCardSuccessfulMX.document_number,
      },
      {
        merchantId,
        merchantPrivateKey: privateKey,
      }
    );

    await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
  });

  test(
    '@PAYM-T2219 Handle CVV required: ff enabled - order_token not send - not tokenized card - cvv_required=true',
    { tag: ['@payment_widget', '@cvv', '@vault', '@team_payments_capabilities'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminSpecificRulesPage = new AdminSpecificRulesPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('Creates manual store code rule for store all', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: 'all',
              condition: 'eq',
              stores: 'all',
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, 'all');
        await adminPaymentStrategyPage.nextStepRoutingConfig();
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.mercadopago,
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
      });

      await test.step('The Statsig rule is live for this merchant', async () => {
        // The CVV behaviour under test depends on the gate rule written in beforeAll,
        // which the service only sees after it downloads the config spec again. Returns
        // immediately when the setup above already covered that window.
        await configStatsig.pollUntilRuleIsLive(FlagNames.ShouldHandleCvvRequired, merchantId);
      });

      await test.step('The user opens the widget and navigates to the payments page', async () => {
        const ecommercePage = new EcommercePage(page);
        const testingTool = nagivateAndConfigureWidget(page, 'Checkout en Pasos');
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        await ecommercePage.goToCheckoutInStepsPage();
        await ecommercePage.fillUserEmail(userEmail);
        await ecommercePage.clickOnCheckoutByStepsContinueButton();
        await ecommercePage.selectPaymentWidgetModalOption();
        await ecommercePage.clickOnConfirm();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadopagoMasterCardSuccessfulMX,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPayAndWaitForCardCreation();
      });

      await test.step('It is validated that the order has been processed successfully', async () => {
        const status = 'processed';
        const orderToken = await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200, {
          disableBodyVerification: true,
        });
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.mercadopago);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('The user opens the widget and navigates to the payments page', async () => {
        const ecommercePage = new EcommercePage(page);
        const testingTool = nagivateAndConfigureWidget(page, 'Checkout en Pasos');
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        await ecommercePage.goToCheckoutInStepsPage();
        await ecommercePage.fillUserEmail(userEmail);
        await ecommercePage.clickOnCheckoutByStepsContinueButton();
        await ecommercePage.selectPaymentWidgetModalOption();
        await ecommercePage.clickOnConfirm();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.enterOTPCode();
        await paymentDeunaNowPage.waitForPostResponse('users/.*/cards', 200);
        await paymentDeunaNowPage.waitForSelectedCardLastFour();
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.fillCvvCode(
          creditCardData.mercadopagoMasterCardSuccessfulMX.cvv_code
        );
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully', async () => {
        const status = 'processed';
        const orderToken = await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200, {
          disableBodyVerification: true,
        });
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.mercadopago);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );

  test.afterAll('Remove statsig rule', async () => {
    await test.step('Attempt to remove statsig rule', async () => {
      await configStatsig.deleteMerchantIDFromUniqueFeatureGateRule(
        FlagNames.ShouldHandleCvvRequired,
        statsigRuleID
      );
    });
  });
});
