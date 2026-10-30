import { expect } from '@deuna/test';
import { test } from '@deuna/test';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { defaultPlanOptionId, SplitPaymentPage } from '@pages/split_payment/splitPaymentPage';
import { InstallmentEvents, InstallmentRequest, InstallmentsResponse } from '../share/Installments';

const configMerchant = new ConfigMerchant();

// E2E test for Split Payments with installments (guest user):
// - Validates installment selection and recalculation across single/split payment modes
// - Tests card deletion/re-entry, amount adjustments (10%/90%, 20%/80%), and order refresh
// - Verifies installment persistence and updates when navigating between steps
// - Confirms onInstallmentSelected events fire correctly with updated amounts throughout the flow

//new
test.describe('@regression Guest: BIN and amount change with step navigation persistence', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.globalpayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
    await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      // Open the testing page and navigate to the widget to be tested
      const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
      await testingTool.setUpExplore({
        orderToken: '',
        merchantCredentials: { publicKey, privateKey },
      });
      const ecommercePage = new EcommercePage(page);
      await ecommercePage.clickOnProduct('earphones');
      await ecommercePage.addToCart();
      await ecommercePage.clickOnIconBasket();
      await testingTool.navigateToSelectOrderType();
    }
  );

  test(
    '@ENTP1-T2382 Flujo Guest: BIN and amount change with step navigation persistence',
    {
      tag: ['@team_enterprise', '@elements_link', '@split_payment', '@fixme_preprod'],
    },
    async ({ page }) => {
      const paymentPage = new PaymentPage(page);
      await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
      await paymentPage.clickOnPayButtonEmbedded();
      const splitPaymentPage = new SplitPaymentPage(page);
      const vaultWidgetPage = new VaultWidgetPage(page);
      const installmentEvents = new InstallmentEvents(page);
      const installmentRequest = new InstallmentRequest(page);

      //Installments
      const threeInstallments = '3';
      const sixInstallments = '6';

      //Amounts
      const splitedAmount = '31710000';
      const splitedAmountAfterDiscountCard1 = '63270000';
      const splitedAmountAfterDiscountCard2 = '150000';
      const discountedAmount2 = '1500';

      //Cards
      const firstCard = creditCardData.mercadoPagoVisaCardSuccessful;
      const firstBin = firstCard.number.slice(0, 6);
      const secondCard = creditCardData.mercadoPagoVisaCardSuccessful;
      const secondBin = secondCard.number.slice(0, 6);
      const thirdCard = creditCardData.mercadopagoMasterCardSuccessfulCO;
      const thirdBin = thirdCard.number.slice(0, 6);

      //Responses
      let responseInstallments1: InstallmentsResponse;
      let responseInstallments2: InstallmentsResponse;

      //Steps
      await test.step('User enters first card details in the Single Payment Flow', async () => {
        const response = installmentRequest.waitForResponse(firstBin);

        installmentEvents.waitForInstallmentSelected(firstBin, 0, {
          condition: (data) => data.properties?.metadata?.planOptionId === defaultPlanOptionId,
        });

        await vaultWidgetPage.fillCardForm(firstCard);
        responseInstallments1 = await response;
      });

      // Step 2:
      await test.step('User selects 3 installments for card 1', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(firstBin, 0, {
          condition: (data) => data.properties?.metadata?.installments === 3,
        });

        const option3 = installmentRequest.findInstallmentByNumber(responseInstallments1, 3);
        await vaultWidgetPage.selectInstallmentsMSI(threeInstallments);

        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(option3.plan_option_id);
      });

      await test.step('User proceeds to Split Payments', async () => {
        const response = installmentRequest.waitForResponse(firstBin, splitedAmount);
        const eventData = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        await vaultWidgetPage.clickPayWithTwoCards();
        responseInstallments1 = await response;
        const optionSplit3 = installmentRequest.findInstallmentByNumber(responseInstallments1, 3);

        expect((await eventData).planOptionId).toBe(optionSplit3.plan_option_id);
        // (1) event onInstallmentSelected with default installment recalculated for new split amount
      });

      await test.step('User deletes card 1', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected('', 0);
        await vaultWidgetPage.fillCardNumber('');
        // (2) expect event onInstallmentSelected with minimal default installment
        await vaultWidgetPage.assertInstallmentsFieldHidden();
        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
      });

      await test.step('User enters another card and selects installments again', async () => {
        const response = installmentRequest.waitForResponse(thirdBin, splitedAmount);
        const eventPromise = installmentEvents.waitForInstallmentSelected(thirdBin, 0, {
          condition: (data) => data.properties?.metadata?.installments === 3,
        });
        await vaultWidgetPage.fillCardNumber(thirdCard.number);
        responseInstallments1 = await response;
        const optionSplit3 = installmentRequest.findInstallmentByNumber(responseInstallments1, 3);

        // Validates user can enter a different card (third card) and select 3 installments with correct planOptionId
        await vaultWidgetPage.selectInstallmentsMSI(threeInstallments);
        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(optionSplit3.plan_option_id);
      });

      await test.step('User continues to step 2', async () => {
        await vaultWidgetPage.clickContinueWithCard2();
      });

      await test.step('User enters second card details', async () => {
        const response = installmentRequest.waitForResponse(secondBin, splitedAmount);
        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1);
        await vaultWidgetPage.fillCardForm(secondCard);
        responseInstallments2 = await response;
        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
        // Validates onInstallmentSelected event fires with default installment (1) for card 2
      });

      await test.step('User selects 3 installments for card 2', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1, {
          condition: (data) => data.properties?.metadata?.installments === 3,
        });
        await vaultWidgetPage.selectInstallmentsMSI(threeInstallments);

        // Validates user can select 3 installments for card 2 with correct planOptionId
        const optionSplit3 = installmentRequest.findInstallmentByNumber(responseInstallments2, 3);
        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(optionSplit3.plan_option_id);
      });

      await test.step('User adjusts amounts: 10% card 1 / 90% card 2', async () => {
        const response1 = installmentRequest.waitForResponse(
          thirdBin,
          splitedAmountAfterDiscountCard1
        );
        const response2 = installmentRequest.waitForResponse(
          secondBin,
          splitedAmountAfterDiscountCard2
        );

        const eventPromise = installmentEvents.waitForInstallmentSelected(thirdBin, 0);
        const eventPromise2 = installmentEvents.waitForInstallmentSelected(secondBin, 1);

        await splitPaymentPage.adjustAmountForCard(2, discountedAmount2);

        responseInstallments1 = await response1;
        responseInstallments2 = await response2;

        const optionSplit3Card1 = installmentRequest.findInstallmentByNumber(
          responseInstallments1,
          3
        );

        expect((await eventPromise).planOptionId).toBe(optionSplit3Card1.plan_option_id);
        expect((await eventPromise2).planOptionId).toBe(defaultPlanOptionId);

        // (6) expect event onInstallmentSelected for card 1, same three installments but with new amount
        // (7) expect event onInstallmentSelected for card 2, default installment
      });

      await test.step('User proceeds to step 3 (summary)', async () => {
        await vaultWidgetPage.clickContinueWithThePaymentSummary();
        await vaultWidgetPage.assertAlertInfoNotification();
      });

      await test.step('From summary, user gets back to card 1 ', async () => {
        await splitPaymentPage.backToCard(1);
      });

      await test.step('User verifies card 1 installments persist (3 cuotas) after returning from summary', async () => {
        await expect(vaultWidgetPage.inputInstallments).toBeVisible();
        await expect(vaultWidgetPage.inputInstallments).toContainText(threeInstallments);
      });

      await test.step('User re-select 6 installments for card 1 and confirm', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(thirdBin, 0);
        await vaultWidgetPage.selectInstallmentsMSI(sixInstallments);
        const eventData = await eventPromise;
        const optionSplit6 = installmentRequest.findInstallmentByNumber(responseInstallments1, 6);
        expect(eventData.planOptionId).toBe(optionSplit6.plan_option_id);
        // (8) expect event onInstallmentSelected for card 1, 6 installments
      });

      await test.step('User goes to step 3 (summary) and assert event vaultSaveSuccess was fired', async () => {
        await vaultWidgetPage.clickContinueWithCard2();
        const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
        await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
        await eventPromise;
      });
    }
  );
});
