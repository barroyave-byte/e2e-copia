import { test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { stripeProcessor } from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentLinkRedirectPage } from '@pages/bnpl/paymentLinkPage';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { createPaymentLinkOrderPayload } from '@visual/utils/payment_link/create_payment_link_order_payload';

const configMerchantCheckout = new ConfigMerchantCheckout();

const checkout_modules: CheckoutModule[] = [
  {
    name: 'OrderDetailPattern',
    props: {
      hide_product_image: true,
    },
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
        {
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
        },
        {
          name: 'phone',
          validation: {
            required: true,
          },
        },
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'address2',
          validation: {
            required: false,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
        {
          name: 'zipcode',
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
          name: 'country',
          validation: {
            required: true,
          },
        },
      ],
    },
  },
];

test.describe(
  '@regression @visual Checkout Modules widgets configuration',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(stripeProcessor, merchantId, merchantToken);

      await apiCallNewman.createCheckoutModulesConfig(checkout_modules, merchantId, merchantToken);
      const orderPayload = createPaymentLinkOrderPayload();

      const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        orderPayload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenizeResponse.data.token;
    });

    test(
      '@ENTP1-T2093 Datos de facturación visibles - Checkbox',
      { tag: ['@visual', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        let paymentLinkRedirectPage: PaymentLinkRedirectPage;

        await test.step('Should opens the payment link', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });

          const addiRedirectPagePromise = page.waitForEvent('popup');
          const popup = await addiRedirectPagePromise;
          paymentLinkRedirectPage = new PaymentLinkRedirectPage(popup);
          await paymentLinkRedirectPage.waitUntilLoaded();
        });

        await test.step('Billing form must be hidden by default', async () => {
          await paymentLinkRedirectPage.assertBillingFormIsHidden();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            paymentLinkRedirectPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step1-verify-payment-link-screen-billing-form-hidden'
          );
        });

        await test.step('Billing form must be visible by clicking in checkbox', async () => {
          await paymentLinkRedirectPage.showBillingForm();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            paymentLinkRedirectPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step2-verify-payment-link-screen-billing-form-visible'
          );
        });

        await test.step('Billing card data must be visible', async () => {
          await paymentLinkRedirectPage.fillBillingForm();
        });

        await test.step('User verifies UI ', async () => {
          await verifyVisualConsistency(
            paymentLinkRedirectPage.page,
            commonViewportSets.desktopAndFullscreen,
            'step3-verify-payment-link-screen-billing-card-visible'
          );
        });
      }
    );
  }
);
