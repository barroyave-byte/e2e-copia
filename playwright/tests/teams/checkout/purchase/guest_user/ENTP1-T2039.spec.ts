import { test } from '@support/fixtures';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';
import * as userData from '@support/interfaces/user_data';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { LoginPage } from '@pages/payment_link/user_data/loginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.nuveiMasterCardSucessfull.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBodyFromCommerce({
          country: 'MX',
          user_email: email,
          order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createCheckoutModulesConfig(
        [
          {
            name: 'LoginWithEmailOrderPattern',
          },
          {
            name: 'UserInfoPattern',
          },
          {
            name: 'OrderDetailPattern',
          },
        ],
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2039 Payment Link: Installments MSi',
      { tag: ['@review_action', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const loginPage = new LoginPage(paymentLinkPage);
        const guestUserPage = new GuestUserDataPage(paymentLinkPage);
        const installments = '3';
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user continues as guest', async () => {
          await loginPage.clickOnContinueWithoutEnterCode();
        });

        await test.step('The user fills user information', async () => {
          await guestUserPage.enterGuestUserData(userData.userDataMX);
        });

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.nuveiMasterCardSucessfull, {
            country: 'MX',
          });
        });

        await test.step('User select MSI', async () => {
          await paymentPage.selectInstallmentsMSI(installments);
        });

        await test.step('The user does not see terms and conditions', async () => {
          await paymentPage.assertUserDoesNotSeeTermsAndConditions();
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('order is processed successfully', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
