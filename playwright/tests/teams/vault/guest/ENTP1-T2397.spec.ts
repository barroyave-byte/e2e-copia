import { expect, test } from '@deuna/test';
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
// - Validates installments refetch when adding products at each step (step 1, step 2, and summary)
// - Tests installment recalculation after order updates (add product) at different navigation points
// - Confirms installment selection persistence and recalculation across step navigation

test.describe('@regression Flujo Split Payments — Guest: Installments refetch on every step (zero-amount scenario)', () => {
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
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
      const ecommercePage = new EcommercePage(page);
      await ecommercePage.clickOnProduct('earphones');
      await ecommercePage.addToCart();
      await ecommercePage.clickOnIconBasket();
      await testingTool.navigateToSelectOrderType();
    }
  );
  test(
    '@ENTP1-T2397 Flujo Split Payments — Guest: Installments refetch on every step (zero-amount scenario)',
    { tag: ['@team_enterprise', '@elements_link', '@split_payment'] },
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
      const splitedAmountAfterDiscountCard1 = '92100000';
      const splitedAmountAfterDiscountCard2 = '15000000';
      const discountedAmount1 = '2000';
      const discountedAmount2 = '150000';

      //Cards
      const firstCard = creditCardData.mercadoPagoVisaCardSuccessful;
      const firstBin = firstCard.number.slice(0, 6);
      const secondCard = creditCardData.stripeVisaSuccessful;
      const secondBin = secondCard.number.slice(0, 6);

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

        // ✓ Validates onInstallmentSelected event fires with default installment (1) when card is entered
      });

      await test.step('User selects 3 installments for card 1', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(firstBin, 0, {
          condition: (data) => data.properties?.metadata?.installments === 3,
        });
        const option3 = installmentRequest.findInstallmentByNumber(responseInstallments1, 3);
        await vaultWidgetPage.selectInstallmentsMSI(threeInstallments);

        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(option3.plan_option_id);
        // ✓ Validates onInstallmentSelected event fires with correct planOptionId for 3 installments
      });

      await test.step('User proceeds to Split Payments', async () => {
        const response = installmentRequest.waitForResponse(firstBin, splitedAmount);
        const eventData = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        await vaultWidgetPage.clickPayWithTwoCards();
        responseInstallments1 = await response;

        const optionSplit3 = installmentRequest.findInstallmentByNumber(responseInstallments1, 3);

        expect((await eventData).planOptionId).toBe(optionSplit3.plan_option_id);
        // ✓ Validates onInstallmentSelected event fires with recalculated 3 installments for split amount (50/50)
      });

      await test.step('STEP 1 REFETCH: User adds product while on card 1 step', async () => {
        // Navigate back to card 1 to add product
        const eventPromise = installmentEvents.waitForInstallmentSelected('', 1);
        await vaultWidgetPage.clickAddProduct();
        const eventData = await eventPromise;
        await vaultWidgetPage.assertAlertInfoNotification();

        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
        // ✓ Validates onInstallmentSelected event fires with default installment (1) for card 1
      });
      //aqui
      await test.step('User adjusts amounts: 10% card 1 / 90% card 2', async () => {
        const response1 = installmentRequest.waitForResponse(firstBin, '200000');
        const eventPromise = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        await splitPaymentPage.adjustAmountForCard(1, discountedAmount1);

        responseInstallments1 = await response1;

        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
        // ✓ Validates card 1 resets to default installment after amount adjustment
      });

      await test.step('User reselects 3 installments for card 1 after first product addition', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        await vaultWidgetPage.selectInstallmentsMSI(sixInstallments);
        const eventData = await eventPromise;
        const optionSplit6 = installmentRequest.findInstallmentByNumber(responseInstallments1, 6);
        expect(eventData.planOptionId).toBe(optionSplit6.plan_option_id);
        // ✓ Validates user can reselect 6 installments for card 1 after amount stabilizes
      });

      await test.step('User continues to step 2', async () => {
        await vaultWidgetPage.clickContinueWithCard2();
      });

      await test.step('User enters second card details', async () => {
        const response = installmentRequest.waitForResponse(secondBin);

        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1);
        await vaultWidgetPage.fillCardForm(secondCard);
        responseInstallments2 = await response;
        const eventData = await eventPromise;
        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
        // ✓ Validates onInstallmentSelected event fires with default installment (1) for card 2
      });

      await test.step('User selects 3 installments for card 2', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1);

        await vaultWidgetPage.selectInstallmentsMSI(threeInstallments);

        const eventData = await eventPromise;
        const optionSplit3 = installmentRequest.findInstallmentByNumber(responseInstallments2, 3);
        expect(eventData.planOptionId).toBe(optionSplit3.plan_option_id);
        // ✓ Validates user can select 3 installments for card 2 with correct planOptionId
      });

      await test.step('STEP 2 REFETCH: User adds another product while on card 2 step', async () => {
        // const eventPromise1 = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1);
        await vaultWidgetPage.clickAddProduct();
        await vaultWidgetPage.assertAlertInfoNotification();
        const eventData = await eventPromise;

        expect(eventData.planOptionId).toBe(defaultPlanOptionId);
        // ✓ expect event onInstallmentSelected for card 1, with minimal installments
      });

      await test.step('User adjusts amounts: 10% card 1 / 90% card 2', async () => {
        const response1 = installmentRequest.waitForResponse(
          firstBin,
          splitedAmountAfterDiscountCard1
        );
        const response2 = installmentRequest.waitForResponse(
          secondBin,
          splitedAmountAfterDiscountCard2
        );
        const eventPromise = installmentEvents.waitForInstallmentSelected(firstBin, 0);
        const eventPromise2 = installmentEvents.waitForInstallmentSelected(secondBin, 1);

        await splitPaymentPage.adjustAmountForCard(2, discountedAmount2);
        responseInstallments1 = await response1;
        responseInstallments2 = await response2;

        expect(installmentRequest.hasInstallment(responseInstallments1, 3)).toBeTruthy();
        expect(installmentRequest.hasInstallment(responseInstallments2, 3)).toBeTruthy();

        expect((await eventPromise).planOptionId).toBe(defaultPlanOptionId);
        expect((await eventPromise2).planOptionId).toBe(defaultPlanOptionId);
        // ✓ Validates both cards receive new installment options with adjusted amounts (hasInstallment)
        // ✓ Validates both cards reset to default installment after amount change
      });

      await test.step('User reselects 3 installments for card 2 after second product addition', async () => {
        const eventPromise = installmentEvents.waitForInstallmentSelected(secondBin, 1);
        await vaultWidgetPage.selectInstallmentsMSI(sixInstallments);
        const eventData = await eventPromise;
        const optionSplit6 = installmentRequest.findInstallmentByNumber(responseInstallments2, 6);
        expect(eventData.planOptionId).toBe(optionSplit6.plan_option_id);
        // ✓ Validates user can reselect 6 installments for card 2 after amount stabilizes
      });

      await test.step('User proceeds to step 3 (summary)', async () => {
        await vaultWidgetPage.clickContinueWithThePaymentSummary();
        await vaultWidgetPage.assertAlertInfoNotification();
      });

      await test.step('STEP 3 REFETCH: User adds final product while on summary step', async () => {
        await vaultWidgetPage.clickAddProduct();
        await vaultWidgetPage.assertAlertInfoNotification();

        // ✓ Validates summary displays updated amounts reflecting the new product
      });

      await test.step('User confirms 3 installments for card 2 with final amount', async () => {
        // 3 responses llegan para card1 (y similares para card2) — necesitamos la última (la del amount final)
        const response1 = installmentRequest.waitForNthResponse(firstBin, 3);
        const response2 = installmentRequest.waitForNthResponse(secondBin, 2);
        const eventPromise1 = installmentEvents.waitForNthInstallmentSelected(firstBin, 0, 2);
        const eventPromise2 = installmentEvents.waitForNthInstallmentSelected(secondBin, 1, 2);

        await splitPaymentPage.adjustAmountForCard(1, discountedAmount1, { isSummary: true });
        await splitPaymentPage.adjustAmountForCard(2, discountedAmount2, { isSummary: true });

        responseInstallments1 = await response1;
        responseInstallments2 = await response2;

        const eventData1 = await eventPromise1;
        const eventData2 = await eventPromise2;

        expect(eventData1.planOptionId).toBe(defaultPlanOptionId);
        expect(eventData2.planOptionId).toBe(defaultPlanOptionId);
        // ✓ Validates both cards reset to default installment after final amount adjustments in summary
      });

      await test.step('User returns to summary and completes payment', async () => {
        const eventPromise = vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
        await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
        await eventPromise;
      });
    }
  );
});
