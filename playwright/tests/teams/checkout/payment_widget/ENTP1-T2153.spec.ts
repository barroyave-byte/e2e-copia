import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { newCustomStyleWithoutPMTitle } from '@support/mocks/newcustomStyleWithoutPMTitle';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(newCustomStyleWithoutPMTitle),
      },
    ],
  },
};
const email = EmailGenerator.generateRegisteredUserEmail();
const amount = '190000';

test.describe(
  '@regression PaymentWidget: BackAction closing widget when overrides from customStyle',
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
        user_email: email,
        amount: Number(amount),
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
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
      '@ENTP1-T2153 PaymentWidget: BackAction closing widget when overrides from customStyle',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Assert theme config is has proper custom styles', async () => {
          await paymentDeunaNowPage.assertThemeConfigCustomStyles(
            {
              ...newCustomStyleWithoutPMTitle.theme.colors,
              ...newCustomStyleWithoutPMTitle.theme.typography,
            },
            false
          );
        });

        await test.step('Assert merchant logo shows the configured URL', async () => {
          const merchantLogoUrl =
            newCustomStyleWithoutPMTitle.HeaderPattern.overrides.Logo.props.url;
          await paymentDeunaNowPage.assertMerchantLogoSrc(merchantLogoUrl);
        });

        await test.step('User click on BackAction to close Widget', async () => {
          const widgetClosedEvent = paymentDeunaNowPage.armWidgetClosedListener();
          await paymentDeunaNowPage.clickOnBackAction();
          await paymentDeunaNowPage.assertWidgetIsClosed(widgetClosedEvent);
        });
      }
    );
  }
);
