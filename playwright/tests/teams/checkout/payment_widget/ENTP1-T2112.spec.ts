import { test } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

test.describe(
  '@regression Buy with deuna now using installments',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2112 Validar errores en el formulario de tarjetas y pago exitoso tras corregir los campos faltantes',
      { tag: ['@card', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('User select Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see error messages', async () => {
          await paymentDeunaNowPage.userSeesErrors();
        });

        await test.step('The user completes card form except cvv input', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.kushkiVisaSuccessfull,
              cvv_code: '',
            },
            { country: 'MX' }
          );
        });

        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see CVV error messages', async () => {
          await paymentDeunaNowPage.userDoesSeeErrors('cvvError');
        });

        await test.step('The user fills cvv input', async () => {
          await paymentDeunaNowPage.fillInputCvv(creditCardData.kushkiVisaSuccessfull.cvv_code);
        });

        await test.step('The user completes card form except expiration_date input', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.kushkiVisaSuccessfull,
              document_number: IDENTITY_DOCUMENTS.MX.RFC,
              expiration_date: '',
            },
            { country: 'MX' }
          );
        });
        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see Exp Date error messages', async () => {
          await paymentDeunaNowPage.userDoesSeeErrors('expDateError');
        });

        await test.step('The user fills expiration_date input', async () => {
          await paymentDeunaNowPage.fillInputExpirationDate(
            creditCardData.kushkiVisaSuccessfull.expiration_date
          );
        });

        await test.step('The user completes card form except cardholder_name input', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.kushkiVisaSuccessfull,
              document_number: IDENTITY_DOCUMENTS.MX.RFC,
              cardholder_name: 'Darwin123',
            },
            { country: 'MX' }
          );
        });

        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see card holder invalid characters error message', async () => {
          await paymentDeunaNowPage.userDoesSeeErrors('cardHolderError');
        });

        await test.step('The user enters only first name', async () => {
          await paymentDeunaNowPage.clearInputsCreditCard('holderName');
          await paymentDeunaNowPage.fillInputHolderName('Jhon ');
        });

        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see card holder missing last name error message', async () => {
          await paymentDeunaNowPage.userDoesSeeErrors('cardHolderMissingLastNameError');
        });

        await test.step('The user completes cardholder_name input', async () => {
          await paymentDeunaNowPage.clearInputsCreditCard('holderName');
          await paymentDeunaNowPage.fillInputHolderName(
            creditCardData.kushkiVisaSuccessfull.cardholder_name
          );
        });
        await test.step('User clears credit card number input', async () => {
          await paymentDeunaNowPage.clearInputsCreditCard('creditCardNumber');
        });

        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickOnPayButton(false);
        });

        await test.step('The user can see card number error messages', async () => {
          await paymentDeunaNowPage.userDoesSeeErrors('cardError');
        });

        await test.step('The user fills card number input', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.kushkiVisaSuccessfull,
            { country: 'MX' }
          );
        });

        await test.step('User clicks on Pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the status of the order is processed, the number of installments and the type of installments', async () => {
          const status = 'processed';
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus(status);
        });
      }
    );
  }
);
