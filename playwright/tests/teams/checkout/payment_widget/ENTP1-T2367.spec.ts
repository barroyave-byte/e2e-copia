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
import { assertWidgetPaymentMethodsLoaded } from '@support/helpers/widgetHealthCheck';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';

const configMerchant = new ConfigMerchant();

const processors = [
  VoucherProcessors.bazReference,
  VoucherProcessors.oxxoReference,
  VoucherProcessors.safetyPayExpress,
];

test.describe(
  '@regression PaymentWidget: Reference processors (baz, oxxo & safetypay_express) are displayed correctly after initiating a payment with volaris_reference',
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
          processorsConfig.createVolarisReference({ currency_iso3: 'EC' }),
          merchantId
        );

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2367 PaymentWidget as Form: Reference processors (baz, oxxo & safetypay_express) are displayed correctly after initiating a payment with volaris_reference',
      { tag: ['@team_enterprise', '@admin-preprod'] },
      async ({ page }) => {
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

        await test.step('The available reference processors are displayed', async () => {
          await voucherProcessorsPage.assertTitleProcessors(processors);
        });

        await test.step('SafetyPay Express accordion is expanded by default (if present)', async () => {
          await voucherProcessorsPage.assertProcessorAccordionOpen(
            VoucherProcessors.safetyPayExpress
          );
        });

        await test.step('The user opens the BAZ reference accordion and verifies content', async () => {
          await voucherProcessorsPage.openProcessorAccordion(VoucherProcessors.bazReference);
          await voucherProcessorsPage.assertProcessorContentVisible(VoucherProcessors.bazReference);
        });

        await test.step('The user opens the OXXO reference accordion and verifies content', async () => {
          await voucherProcessorsPage.openProcessorAccordion(VoucherProcessors.oxxoReference);
          await voucherProcessorsPage.assertProcessorContentVisible(
            VoucherProcessors.oxxoReference
          );
        });

        await test.step('The user verifies the payment status is "processing" in the admin panel', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processing');
        });
      }
    );
  }
);
