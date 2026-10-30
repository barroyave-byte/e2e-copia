import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { VoucherProcessors, VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { referenceOrderPayload } from './share/referenceOrderPayload';
import { FormsPage } from '@pages/explore/formsPage';
import { configureVolarisReference } from './share/referenceSetup';
import { buildWebhookPayment } from '@support/http/testData/payment/TransactionWebhook';
import { assertWidgetPaymentMethodsLoaded } from '@support/helpers/widgetHealthCheck';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';

const configMerchant = new ConfigMerchant();

const processors = [VoucherProcessors.safetyPayExpress];
const currency = 'USD';

test.describe(
  '@regression PaymentWidget as Form: successful purchase using safetypay_express with volaris_reference',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        referenceOrderPayload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenized.data.token;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: MERCHANT_LOGO_WIDGETS_CONFIG },
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await configureVolarisReference(
          page,
          processorsConfig.createVolarisReference({
            currency_iso3: 'EC',
            extra_params: {
              reference_payment_supported: processors,
            },
          }),
          merchantId
        );

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          generatorsExcluded: ['oxxo_reference', 'baz_reference'],
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2369 PaymentWidget as Form: successful purchase using safetypay_express with volaris_reference',
      { tag: ['@team_enterprise', '@admin-preprod'] },
      async ({ page, context, paymentService, emaService }) => {
        await page.route('**/*iubenda*', (route) => route.abort());
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        const formsPage = new FormsPage(page);

        await test.step('select volaris_reference processor', async () => {
          await formsPage.selectProcessorToOpenModal('reference');
        });

        await test.step('Validate widget loaded payment methods', async () => {
          await assertWidgetPaymentMethodsLoaded(page);
        });

        await test.step('The user selects the reference country', async () => {
          await paymentDeunaNowPage.selectReferenceCountry();
        });

        await test.step('The user clicks the Pay button', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('The order status is "processing"', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processing', 200);
        });

        await test.step('The available safetypay_express reference processor is displayed', async () => {
          await voucherProcessorsPage.assertTitleProcessors(processors);

          await voucherProcessorsPage.assertProcessorTitleIsHidden(VoucherProcessors.bazReference);
          await voucherProcessorsPage.assertProcessorTitleIsHidden(VoucherProcessors.oxxoReference);
        });

        await test.step('"safetypay_express" accordion is expanded by default', async () => {
          await voucherProcessorsPage.assertProcessorAccordionOpen(
            VoucherProcessors.safetyPayExpress
          );
        });

        await test.step('Wait for SafetyPay iframe and extract transaction data', async () => {
          await voucherProcessorsPage.waitForSafetyPayIframe();
          await voucherProcessorsPage.extractDataToCompleteTransaction();
        });

        await test.step('Click on "Pay in SafetyPay"', async () => {
          await voucherProcessorsPage.clickOnPayInSafetyPay();
        });

        await test.step('Wait for the external SafetyPay bank view to load', async () => {
          await voucherProcessorsPage.waitForExternalSafetyPayBankView();
        });

        await test.step('Open the SafetyPay sandbox demo bank page', async () => {
          await voucherProcessorsPage.openSandboxDemoBankSafetyPayPage(context);
        });

        await test.step('Log in with sandbox demo bank credentials', async () => {
          await voucherProcessorsPage.loginSandboxDemoBankCredentials();
        });

        await test.step('Confirm the transaction on the demo bank page', async () => {
          await voucherProcessorsPage.confirmTransaction();
        });

        await test.step('Close the sandbox demo bank page', async () => {
          await voucherProcessorsPage.closeSandboxDemoBankPage();
          await voucherProcessorsPage.closeBankLoginPopup();
          await voucherProcessorsPage.assertRedirectingAfterPaymentConfirmation();
        });

        await test.step('Send webhook to notify the payment status', async () => {
          const order = await emaService.getOrder(privateKey, orderToken);
          const externalTransactionId = order.data.order.payment.data.external_transaction_id;
          const merchantPaymentProcessorId =
            order.data.order.payment.data.merchant_payment_processor_id;

          const webhookData = buildWebhookPayment();
          webhookData.MerchantSalesID = `${merchantId}`;
          webhookData.ReferenceNo = `${externalTransactionId}`;

          await paymentService.sendPaymentWebhook(
            merchantId,
            merchantPaymentProcessorId,
            webhookData
          );
        });

        await test.step('The user verifies the payment status is "processed" in the admin panel', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
