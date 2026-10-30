import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { FlagNames, RuleNames } from '@support/interfaces/statsig/statsig';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import ConfigStatsig from '@support/api_sup/config_merchant_sup/configStatsig';
import { ServiceFactory } from '@support/http';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { commonViewportSets } from '@visual/utils/viewports';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { EmailGenerator } from '@support/utils/EmailGenerator';

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
const userEmail = EmailGenerator.generateRegisteredUserEmail();

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
      '@ENTP1-T2384 Payment Widget - usuario autenticado - pago sin cvv - modal cvv - validación de eventos',
      {
        tag: ['@visual', '@team_enterprise'],
        annotation: { type: 'bug', description: 'PAYM-5971' },
      },
      async ({ page, paymentRoutingService }) => {
        // Get merchant ID from config
        const merchantID = merchantId;

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

        let ruleData: { id: number; requestBody: Record<string, any> } | null = null;

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
          const ruleDataPromise = adminPaymentStrategyPage.getCreatedRuleData(merchantID, 'all');
          await adminPaymentStrategyPage.saveRule();
          await adminPaymentStrategyPage.validateCustomRuleCreated('all');
          ruleData = await ruleDataPromise;
          expect(Boolean(ruleData)).toBeTruthy();
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

        await test.step('Enable cvv required', async () => {
          const requestBody = ruleData?.requestBody ?? {};
          const members = requestBody.members as Record<string, any>[];
          expect(members.length === 1).toBeTruthy();

          requestBody.members = [
            {
              ...members[0],
              capabilities: ['cvv'],
            },
          ];

          await paymentRoutingService.updateMerchantRule(
            merchantId,
            String(ruleData?.id),
            merchantToken,
            requestBody
          );
        });

        await test.step('The user clicks pay, cvv modal must be visible', async () => {
          await paymentDeunaNowPage.clickOnPayButton();
          await paymentDeunaNowPage.assertEventWasFired(
            CheckoutEventsName.paymentMethodsCardSecurityCodeModalOpened
          );
          await paymentDeunaNowPage.assertCvvModalIsVisible();

          await verifyVisualConsistency(
            paymentDeunaNowPage.page,
            commonViewportSets.desktopOnly,
            'validate-cvv-modal-is-visible'
          );
        });

        await test.step('The user fill cvv modal and clicks pay', async () => {
          await paymentDeunaNowPage.assertCvvModalEmitEvents('123');
          await paymentDeunaNowPage.sendCvvInputEnteredInModal();
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
