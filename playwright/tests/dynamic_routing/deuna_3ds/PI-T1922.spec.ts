import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

test.describe('@regression Dynamic routing with DEUNA 3DS', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;

    const firstMerchantProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.unlimitProcessorWithDEUNAThreeDS,
      merchantId,
      merchantToken
    );
    const secondMerchantProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.unlimitProcessorPayconnect,
      merchantId,
      merchantToken
    );

    await apiCallNewman.configDynamicRoutingWithDEUNA3ds(
      processorsConfig.unlimitProcessorID,
      processorsConfig.unlimitProcessorID,
      firstMerchantProcessorID,
      secondMerchantProcessorID,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1922 DEUNA 3DS with routing - Fallo en complete_3ds y cascadeo exitoso',
    { tag: ['@payments_integration', '@team_payments_capabilities'] },
    async ({ page, emaService, transactionTraceService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user inserts a credit card', async () => {
        const creditCard = { ...creditCardData.cybersource3dsVisaFailedChallenge };
        creditCard.cardholder_name = 'Deuna ThreeDS Success After Failure';

        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCard, { country: 'MX' });
      });

      await test.step('The user clicks pay', async () => {
        const page3DS = page.waitForEvent('popup', { timeout: 20000 });

        await paymentDeunaNowPage.clickOnPayButton();

        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectSuccessChallengeCybersource();
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('The timeline reflects the failed challenge and the successful cascade', async () => {
        await apiCallNewman.assertTraceLogs(
          transactionTraceService,
          await apiCallNewman.getTraceTransactionIds(emaService, privateKey, orderToken),
          [
            { message: 'tl_order_created', payload: { status: 'pending' } },
            {
              message: 'tl_routing_generated',
              payload: {
                merchant_payment_processor_name:
                  processorsConfig.unlimitProcessorWithDEUNAThreeDS.name,
              },
            },
            { message: 'tl_three_ds_updated', payload: { three_ds_status: 'created' } },
            { message: 'tl_payment_status_updated', payload: { payment_status: 'pending_3ds' } },
            {
              message: 'tl_three_ds_updated',
              payload: {
                three_ds_status: 'three_ds_challenge_pending',
                three_ds_provider: 'deuna',
              },
            },
            {
              message: 'tl_routing_generated',
              payload: {
                merchant_payment_processor_name: processorsConfig.unlimitProcessorPayconnect.name,
              },
            },
            { message: 'tl_payment_status_updated', payload: { payment_status: 'processed' } },
            { message: 'tl_order_updated', payload: { status: 'succeeded' } },
          ],
          merchantId,
          merchantToken
        );
      });
    }
  );
});
