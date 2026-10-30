import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { customStyleForElektra } from '@support/mocks/customStyleForElektra';

const configMerchant = new ConfigMerchant();

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
const amount = '190000';

test.describe(
  '@regression PaymentWidget: Validar aplicación correcta de CustomStyle para elektra',
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
        user_email: `${crypto.randomUUID()}12345@testuser.com`,
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
      '@ENTP1-T2168 PaymentWidget: Personalización de textos mediante CSS',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Assert theme config is has proper custom styles', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles({
            ...customStyleForElektra.theme.colors,
            ...customStyleForElektra.theme.typography,
          });
        });

        await test.step('Assert payment methods info is has proper custom styles', async () => {
          const paymentMethodsInfo =
            customStyleForElektra.PaymentMethodsPattern.translations.es.paymentMethods.info.card;
          await paymentDeunaNowPage.assertPaymentMethodsInfoCustomStylesWithSubtitle(
            paymentMethodsInfo
          );
        });

        await test.step('Assert billing has proper custom styles', async () => {
          const billing = customStyleForElektra.BillingWithSameData.translations.es.title;
          await paymentDeunaNowPage.assertBillingTitleWithCustomStyles(billing);
        });

        await test.step('Assert card form has proper custom styles', async () => {
          const cardFormInputs = customStyleForElektra.CardPattern.translations.es.inputs;
          await paymentDeunaNowPage.assertCardFormCustomStyles(cardFormInputs);
        });
      }
    );
  }
);
