import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { randomUUID } from 'crypto';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { FormsPage } from '@pages/explore/formsPage';
import { configureSpei } from './share/configureSpei';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { customStyleForSpei } from '@support/mocks/customStyleForSpei';

const configMerchant = new ConfigMerchant();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customStyleForSpei),
      },
    ],
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression PaymentWidget as Form: make SpeiOpm autopurchase and validate voucher',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await configureSpei(page, processorsConfig.createSpeiOpm(), merchantId);
      }
    );

    test(
      '@ENTP1-T2388 PaymentWidget as Form: SpeiOpm processor autopurchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const formsPage = new FormsPage(page);
        const ecommercePage = new EcommercePage(page);

        await test.step('select SpeiOpm processor and the autopurchase occurs', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.setUpExplore({
            orderToken: '',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          await ecommercePage.clickOnProduct();
          await ecommercePage.addToCart();
          await ecommercePage.clickOnIconBasket();
          await testingTool.navigateToSelectOrderType();
          await formsPage.selectProcessorToEmbed('SpeiOpm');
        });

        await test.step('Validate spei voucher', async () => {
          await paymentDeunaNowPage.assertSpeiVoucher(
            customStyleForSpei.VoucherPage.translations.es.header.title.spei_opm,
            customStyleForSpei.VoucherPage.translations.es.body.description.spei_opm,
            customStyleForSpei.VoucherPage.translations.es.body.referenceTitle.spei_opm,
            customStyleForSpei.VoucherPage.translations.es.body.payBefore.spei_opm,
            customStyleForSpei.VoucherPage.translations.es.additionalInfoSection.instructions.title,
            customStyleForSpei.VoucherPage.translations.es.footer.actions.download_reference
              .spei_opm
          );
        });
      }
    );
  }
);
