import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { safetypayOrderPayload } from './share/safetypayOrderPayload';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { SafetypayPage } from '@pages/checkout/safetypay';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { SafetypayVoucherValidator } from '@pages/validators/safetypayVoucherValidator';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression PaymentWidget as Form: Safetypay Direct',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.safetypayProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        safetypayOrderPayload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenized.data.token;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: MERCHANT_LOGO_WIDGETS_CONFIG },
        merchantId,
        merchantToken
      );
    });

    test.fixme(
      '@ENTP1-T2428 PaymentWidget as Form: Safetypay Direct',
      {
        annotation: { type: 'bug', description: 'PI-6465' },
        tag: ['@team_enterprise', '@admin-preprod'],
      },
      async ({ page }) => {
        const formsPage = new FormsPage(page);

        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        const safetypayPage = new SafetypayPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('select safetypay processor and pay', async () => {
          await formsPage.selectProcessorToOpenModal('safetypay');
          const responsePromise = waitForPurchaseResponse(page);
          await paymentDeunaNowPage.clickOnPayButton(false);
          const response = await responsePromise;

          const validator = new SafetypayVoucherValidator();
          await validator.validatePayload(response.request());
          await validator.validateResponse(await response.json());
        });

        await test.step('assert safetypay waiting confirmation', async () => {
          await safetypayPage.assertReferenceLoading();

          await safetypayPage.waitForSafetyPayIframe();
          await safetypayPage.assertWaitingConfirmation();
        });

        await test.step('click see order summary & wait safety pay voucher frame', async () => {
          await safetypayPage.clickButtonSeeOrderSummary();
          await safetypayPage.waitExploreThankYouPage();
          await safetypayPage.waitSafetyPayVoucherFrame();
        });

        await test.step('The user verifies the payment status is "pending" in the admin panel', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
        });
      }
    );
  }
);
