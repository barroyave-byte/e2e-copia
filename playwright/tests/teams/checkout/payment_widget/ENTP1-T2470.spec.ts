import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { customStyleForElektra } from '@support/mocks/customStyleForElektra';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';

const configMerchant = new ConfigMerchant();

const userEmail = `${randomUUID}12345@testuser.com`;
const amount = '190000';
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [
      {
        name: 'PriceBreakdownPattern',
        props: {
          show_in_main_view: false,
          fields: [],
        },
      },
      {
        name: 'BillingPattern',
        props: {
          fields: [
            {
              name: 'address1',
              validation: {
                required: true,
              },
            },
            {
              name: 'address2',
              validation: {
                required: true,
              },
            },
            {
              name: 'additional_description',
              validation: {
                required: true,
              },
            },
            {
              name: 'state_name',
              validation: {
                required: true,
              },
            },
            {
              name: 'city',
              validation: {
                required: true,
              },
            },
          ],
          show_in_main_view: true,
        },
      },
      {
        name: 'BillingSummaryPattern',
        props: {
          fields: [
            {
              name: 'address1',
            },
            {
              name: 'city',
            },
            {
              name: 'state_name',
            },
          ],
        },
      },
    ],
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customStyleForElektra),
      },
    ],
  },
};

test.describe(
  '@regression PaymentWidget: Test de Regresión Visual de Payment Widget con Order Detail Pattern (Elektra)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        amount: Number(amount),
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessorColombia,
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
      '@ENTP1-T2470 PaymentWidget: Test de Regresión Visual de Payment Widget con Order Detail Pattern (Elektra)',
      { tag: ['@visual', '@team_enterprise', '@fixme_preprod'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const paymentPage = new PaymentPage(page);

        await test.step('Assert theme config has proper custom styles', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            ...customStyleForElektra.theme.colors,
            ...customStyleForElektra.theme.typography,
          });
        });

        await test.step('Wait until load page', async () => {
          await paymentDeunaNowPage.waitUntilLoadPage();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopAndFullscreen,
            'step1-verify-payment-widget-main-view-with-order-detail-pattern',
            { maxDiffPixelRatio: 0.01 }
          );
        });

        await test.step('User verifies billing form UI colors consistency', async () => {
          await paymentPage.showBillingForm();
          await paymentPage.assertDefaultDropdownArrowColor();
        });

        await test.step('User verifies Order Detail Pattern layout on tablet', async () => {
          await verifyVisualConsistency(
            page,
            commonViewportSets.tabletOnly,
            'step2-verify-order-detail-layout-on-breakpoint-transition',
            { maxDiffPixelRatio: 0.01 }
          );
        });
      }
    );
  }
);
