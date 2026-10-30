import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { MERCADOPAGO_FRAUD_SETTINGS } from '@support/http/testData/fraudSettings/FraudSettingsConfig';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Payment Widget: Mercado Pago fraud credentials configured via API - device fingerprint is sent in purchase request',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService, fraudSettingsService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );

      // Configure Mercado Pago fraud credentials through the fraud-settings API.
      // The checkout must pick this config up and load the MP anti-fraud SDK so
      // the device fingerprint is generated and sent in the purchase request.
      await fraudSettingsService.updateFraudSettings(
        merchantToken,
        merchantId,
        MERCADOPAGO_FRAUD_SETTINGS
      );

      orderToken = (await emaService.tokenizeDeunaNowOrder('MX', privateKey)).data.token;
    });

    test.beforeEach(
      'The user opens the testing page and opens the Payment Widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        // No client-side antiFraudProviders: the fraud provider comes from the
        // fraud-settings API configured in beforeAll.
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2599 Payment Widget: Mercado Pago - fraud credentials via API - device fingerprint is sent into purchase request',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        // Workaround: on the first open the Mercado Pago SDK does not inject
        // device_id into the purchase payload. Closing and reopening the widget
        // forces the SDK to emit it on the next purchase request.
        // Remove this step once the upstream SDK bug is fixed.
        await test.step('Close and reopen Payment Widget (workaround so device_id is sent)', async () => {
          await paymentDeunaNowPage.closeAndReopenPaymentWidget();
        });

        await test.step('The user enters the credit card information', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessfulMX, {
            country: 'MX',
          });
        });

        await test.step('The user clicks pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('The device fingerprint is sent into purchase request with Mercado Pago', async () => {
          await paymentDeunaNowPage.assertDeviceIdInPurchaseRequest({
            antiFraudProvider: ['mercadopago'],
          });
        });
      }
    );
  }
);
