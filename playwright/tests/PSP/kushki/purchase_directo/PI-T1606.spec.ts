import * as debitCardData from '@support/interfaces/debit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression pago con tarjeta de débito Mastercard usando Kushki',
  { tag: ['@getjusto', '@critical_e2e', '@smoke', '@team_payment_integration'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ userAuthService, emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: debitCardData.kushkiVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      // Set credit card for user
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        debitCardData.kushkiVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@PI-T1606 Realizar pago con tarjeta de débito Mastercard usando Kushki',
      { tag: ['@payments_integration', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentWidget = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user opens the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('User logs in', async () => {
          await paymentWidget.enterOTPCode();
        });

        await test.step('The user inserts cvv code from credit card "pagarme_exitosa" from DeunaNow', async () => {
          await paymentWidget.fillCvvCode(debitCardData.kushkiVisaSuccessful.cvv_code);
        });

        await test.step('Click on button finalize purchase', async () => {
          await paymentWidget.clickPay();
        });

        await test.step('The trasaction is processed successfully', async () => {
          const status = 'processed';
          await paymentWidget.assertOrderStatusRequestPurchase(status, 200);

          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus(status);
          await adminOrderDetailsPage.assertPaymentMethod('debit_card');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.kushki);
        });
      }
    );
  }
);
