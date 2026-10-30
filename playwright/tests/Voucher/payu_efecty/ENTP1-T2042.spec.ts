import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { ReferencePayModalPage } from '@pages/explore/forms/oxxo/referecePayModalPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

// Haruka (declarative-apm) renders this title from its own JSON template
// translations (apm.payu_efecty.post_purchase.title), not from a merchant
// theme_config override — the old VoucherPage.PAYU_EFECTY style override has
// no effect anymore and was removed along with its setup call.
const harukaPostPurchaseTitleEs = 'Comprobante de pago Efecty';

test.describe(
  '@regression PayU Efecty Payment Widget Purchase - CO',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYU_EFECTY_PROCESSOR_CHECKOUT_CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const orderBody = DeunacheckoutOrderBuilder.createBody('CO', { amount: 7980000 });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2042 Pago exitoso: Procesador Efecty con Payment Widget',
      { tag: ['@smoke_gmv', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new PaymentPage(page);
        const referencePayModalPage = new ReferencePayModalPage(page);
        let purchaseResponse: Record<string, any>;
        const installments: number = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on the Pay button to purchase', async () => {
          purchaseResponse = (await paymentPage.clickOnPay()).responseData;
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should show the voucher view', async () => {
          await referencePayModalPage.assertHeaderTitle(harukaPostPurchaseTitleEs);
          await referencePayModalPage.assertAmountToPay(
            purchaseResponse.order.display_total_amount
          );
          await referencePayModalPage.assertDeadlineDateCurrentTimeIsDisplayed();
        });

        await test.step('Should download the voucher', async () => {
          await referencePayModalPage.assertDownloadingPaymentReference(
            'Haz tu pago en cualquier puntoEFECTY del país'
          );
        });

        await test.step('Should go to the voucher in PayU', async () => {
          const url = `${purchaseResponse.order.payment.data.next_action.authorization_voucher.url_payment_receipt_html}#/co/cash/receipt_EFECTY`;
          await referencePayModalPage.assertPaymentDetails(url);
        });

        await test.step('Should go to the order summary.', async () => {
          await referencePayModalPage.assertThankYouPage();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.payuEfecty);
          await adminOrderDetailsPage.assertPaymentMethod('voucher');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
