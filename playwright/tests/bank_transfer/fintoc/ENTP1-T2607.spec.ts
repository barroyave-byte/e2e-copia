import { expect, test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FintocOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT/FintocOrderBuilder';
import envConfig from '@support/envConfig';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Fintoc APM - Payment Widget',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let idWebhookTemp: string;
    let publicKey = '';
    let privateKey = '';
    let merchantId = '';

    test.describe.configure({ retries: 3 });
    test.beforeAll(async ({ fintocService }) => {
      const merchant = await configMerchantCheckout.basicSetup('CL');
      publicKey = merchant.publicKey;
      privateKey = merchant.privateKey;
      merchantId = merchant.merchantId;

      const processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.fintocProcessor,
        merchant.merchantId,
        merchant.merchantToken
      );

      await test.step('Create webhooks to fintoc', async () => {
        const webhookUrl = `${envConfig.BASE_URL_POSTMAN}/transactions/webhooks/payconnect/${processorId}`;
        const webhookResponse = await fintocService.createWebhook(webhookUrl);
        const webhookData = webhookResponse.data as any;
        expect(webhookData).toBeDefined();
        expect(webhookData.id).toBeDefined();
        idWebhookTemp = webhookData.id;
      });
    });

    test.afterAll(async ({ fintocService }) => {
      await test.step('Delete webhooks of fintoc', async () => {
        await fintocService.deleteWebhook(idWebhookTemp);
      });
    });

    let orderToken = '';

    // Fresh Fintoc order per attempt (including retries) so each retry gets a
    // new payment intent — reusing the same pi_ causes Fintoc sandbox to show
    // "connection error" on every subsequent attempt.
    test.beforeEach(async ({ emaService }) => {
      const orderBody = FintocOrderBuilder.createOrder();
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test('@ENTP1-T2607 Fintoc pago exitoso', { tag: ['@team_enterprise'] }, async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken,
        merchantCredentials: { publicKey, privateKey },
      });

      await testing.run({
        step: [
          {
            action: 'checkout.apm.fintoc.assertFintocInfoVisible',
            stepName: 'Should validate Fintoc info title and subtitle in widget',
          },
          {
            action: 'checkout.apm.fintoc.clickPayForm',
            stepName: 'Should click Pay button and register Fintoc redirect popup listener',
          },
          {
            action: 'checkout.apm.fintoc.assertFintocPopupVisible',
            stepName: 'Should verify Fintoc redirect popup opens with expected URL',
          },
          {
            action: 'checkout.apm.fintoc.selectBank',
            stepName: 'Should select first bank (Banco Estado) from bank list',
            params: { bankName: 'Banco Estado' },
          },
          {
            action: 'checkout.apm.fintoc.login',
            stepName: 'Should authenticate with test credentials in Fintoc login screen',
            params: { rut: '41.614.850-3', password: 'jonsnow' },
          },
          {
            action: 'checkout.apm.fintoc.selectAccountAndContinue',
            stepName: 'Should wait for account selection screen and click Continuar',
          },
          {
            action: 'checkout.apm.fintoc.completeSecondFactor',
            stepName:
              'Should complete Fintoc second-factor (coordinates, SMS OTP, or mobile-app auth)',
          },
          {
            action: 'checkout.apm.fintoc.assertExploreSuccessPage',
            stepName:
              'Should verify merchant success page appears after Fintoc redirect (onSuccess executed)',
          },
          {
            action: 'admin.orders.goToOrder',
            params: { orderToken, merchantId },
            stepName: 'Should navigate to admin order details page',
          },
          {
            action: 'admin.orders.assertStatus',
            params: { status: 'processed' },
            stepName: 'Should validate order status is processed in admin',
          },
        ],
      });
    });
  }
);
