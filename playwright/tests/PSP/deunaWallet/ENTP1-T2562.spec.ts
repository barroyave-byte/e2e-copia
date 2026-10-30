import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const amount = 5000;

test.describe(
  '@regression Deuna Wallet: Payment Widget Flow with Code: Order Processing to Approval',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        {
          ...processorsConfig.deunaWalletProcessor,
          extra_params: {
            ...processorsConfig.deunaWalletProcessor.extra_params,
            format: 'code',
          },
        },
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('EC', {
        amount,
        user_email: userEmail,
      });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2562 Deuna Wallet: Payment Widget Flow with 6-digit Code: Order Processing to Approval',
      { tag: ['@team_enterprise', '@voucher'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on Pay button', async () => {
          voucherProcessorsPage.waitingPurchaseResponse();
          await paymentPage.clickOnPayButton();
        });

        await test.step('Should validate Deuna Wallet Information', async () => {
          const displayPrice = `USD ${amount / 100}.00`;
          await voucherProcessorsPage.assertDeunaWalletHeaderPrice(displayPrice);
          await voucherProcessorsPage.assertDeunaWalletHeadings();
        });

        await test.step('Should validate Payment Code behaviour', async () => {
          const purchaseResponse = await voucherProcessorsPage.purchaseResponse;
          const responseJson = await purchaseResponse.json();

          if (!purchaseResponse.ok()) {
            throw new Error(
              `Purchase failed with status ${purchaseResponse.status()}: ${JSON.stringify(responseJson)}`
            );
          }

          const code =
            responseJson?.order?.payment?.data?.next_action?.authorization_bank_transfer?.token;
          await voucherProcessorsPage.assertPaymentCodeIsVisible(code);
          await voucherProcessorsPage.assertPaymentCodeBehaviourIsExpected(code);
        });

        await test.step('Should validate voucher instructions behaviour', async () => {
          await voucherProcessorsPage.assertVoucherInstructionsBehaviourIsExpected();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.deunaWallet);
          await adminOrderDetailsPage.assertPaymentMethod('bank_transfer');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
