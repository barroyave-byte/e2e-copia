import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { OxxopayFormPage } from '@pages/explore/forms/oxxo/oxxopayFormPage';
import { ReferencePayModalPage } from '@pages/explore/forms/oxxo/referecePayModalPage';
import { OrderSummaryPage } from '@pages/explore/orderSummaryPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();
const amountToBePaid = 30000;

test.describe('@regression Pays with Oxxo Pay MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: amountToBePaid,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.payuOxxoCashProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1726 Pago exitoso con OXXO Pay',
    {
      tag: [
        '@admin_connection',
        '@admin-preprod',
        '@team_admin',
        '@team_payment_integration',
        '@team_enterprise',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const oxxopayFormPage = new OxxopayFormPage(page);
      const referencePayModalPage = new ReferencePayModalPage(page, 'ES');
      const orderSummaryPage = new OrderSummaryPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('The user open the widget and navigate to forms page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user select OXXO option', async () => {
        await oxxopayFormPage.selectOxxoForm();
      });

      await test.step('The user clicks on pay', async () => {
        await oxxopayFormPage.clickPay();
      });

      await test.step('The user validates the order status', async () => {
        await oxxopayFormPage.assertOrderStatusRequestPurchase('pending', 200);
      });

      await test.step('Validate that the amount to be paid is displayed correctly', async () => {
        const formatedValue = referencePayModalPage.formatAmount(amountToBePaid, 'MXN');
        await referencePayModalPage.assertAmountToPay(String(formatedValue));
      });

      await test.step('Validate that the oxxo pay barcode is displayed correctly', async () => {
        await referencePayModalPage.assertBarCodeIsDisplayed();
      });

      await test.step('Validate that the oxxopay reference number is displayed correctly', async () => {
        await referencePayModalPage.assertReferenceNumberIsDisplayed();
      });

      await test.step('Validate that the "copy" button is displayed', async () => {
        await referencePayModalPage.assertCopyButtonIsDisplayed();
      });

      await test.step('Validate that the payment deadline date and time are displayed correctly', async () => {
        await referencePayModalPage.assertDeadlineDateCurrentTimeIsDisplayed();
      });

      await test.step('Validate that it is possible to display or compress the instructions', async () => {
        await referencePayModalPage.assertInstructionsTextIsDisplay();
        await referencePayModalPage.assertInstructionsTextIsNotDisplay();
      });

      await test.step('Validate that it is possible to download the payment reference and PDF it contains all the instructions for payment', async () => {
        await referencePayModalPage.assertDownloadingPaymentReference(
          'Dile estos números al cajero en cualquier punto OXXO del país. A nombre de: PayU'
        );
      });

      await test.step('The user validates that the thank you page is displayed', async () => {
        await referencePayModalPage.assertThankYouPage();
      });

      await test.step('The user validates that the deadline date and time are those suggested by the processor', async () => {
        await orderSummaryPage.assertDateAndTimeSumaryOrder();
      });

      await test.step('The user validates that the barcode and payment reference number are displayed', async () => {
        await orderSummaryPage.assertBarcodeOrderSumaryDisplayed();
        await orderSummaryPage.assertReferenceNumberOrderSumaryDisplayed();
      });
    }
  );
});
