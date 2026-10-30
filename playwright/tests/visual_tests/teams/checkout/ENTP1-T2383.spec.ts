import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { commonViewportSets } from '@visual/utils/viewports';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';

const configStatsig = new ConfigStatsig();
const configMerchant = new ConfigMerchant();

let statsigRuleID: string;
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
const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

test.describe(
  '@regression @visual Payment Widget - pago sin cvv',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
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

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.kushkiMasterCardExitosa.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.fixme(
      '@ENTP1-T2383 Payment Widget - usuario autenticado - pago sin cvv exitoso',
      {
        tag: ['@visual', '@team_enterprise'],
        annotation: { type: 'bug', description: 'PAYM-5971' },
      },

      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminConnectionsPage = new AdminConnectionsPage(page);
        const adminSpecificRulesPage = new AdminSpecificRulesPage(page);
        const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page);
        const ecommercePage = new EcommercePage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes to connections', async () => {
          await adminHomePage.goToConnections();
        });

        await test.step('The user configure a new connection', async () => {
          await adminConnectionsPage.configureConnection(
            ConnectionsAvailable.kushki,
            processorsConfig.kushkiProcessorWithoutCvvRequired
          );
        });

        await test.step('Creates manual store code rule for store all', async () => {
          await adminHomePage.goToPaymentStrategy();
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
            ConnectionsAvailable.kushki,
            undefined,
            'create',
            false
          );
          await adminPaymentStrategyPage.saveRule();
          await adminPaymentStrategyPage.validateCustomRuleCreated('all');
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
            creditCardData.kushkiMasterCardExitosa,
            { country: 'MX' }
          );
        });

        await test.step('The user clicks pay', async () => {
          await paymentDeunaNowPage.clickPayAndWaitForCardCreation();
        });

        await test.step('The user performs a new purchase with a saved card', async () => {
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

        await test.step('Auth user again and perform a new purchase', async () => {
          await paymentDeunaNowPage.waitForLoadOTPPage();
          await paymentDeunaNowPage.enterOTPCode();
          await paymentDeunaNowPage.assertOneSavedCardWithoutCvvRequired();
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitForSelectedCardLastFour();
          await paymentDeunaNowPage.assertInputUserCardCvvIsNotVisible();

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopOnly,
            'validate-cvv-input-is-not-visible'
          );
        });

        await test.step('Click on pay button', async () => {
          await paymentDeunaNowPage.clickOnPayButton();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
          await ecommercePage.assertBackToHomeButtonIsVisible();
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
  }
);
