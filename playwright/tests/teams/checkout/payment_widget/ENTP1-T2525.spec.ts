import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { ShippingDataPage } from '@pages/checkout/shipping_data/shippingDataPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const cardIdentityDocument = '1234567890';

const checkout_modules: CheckoutModule[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'identity_document',
          validation: {
            required: false,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

test.describe(
  '@regression Payment Widget - Card Pattern + Billing Pattern identity document optional behavior',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.conektaFraud.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorCO,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2525 [IdentityDocumentInput] Card Pattern + Billing Pattern - Optional Field Behavior: Verify Card form and Billing form coexist and leaving the Billing identity document empty does not trigger a Required error',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const shippingDataPage = new ShippingDataPage(page);
        const ecommersePage = new EcommercePage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user & set up PT language', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Card form and Billing form identity document fields coexist in the same payment view', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await test.step('Fill Card form with valid identity document and valid card data', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.kushkiVisaSuccessfull,
            document_number: cardIdentityDocument,
          });
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('Leave Billing identity document empty, fill other required billing fields and save', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await expect(
            shippingDataPage.inputBillingIdentityDocument,
            `CHK: inputBillingIdentityDocument is not visible`
          ).toBeVisible();
          await shippingDataPage.inputBillingIdentityDocument.clear();
          await paymentDeunaNowPage.clickToSaveFormButton();
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await test.step('Pay successfully and verify payload keeps Card identity document while Billing identity document is empty or omitted', async () => {
          await paymentDeunaNowPage.clickPay();
          const purchasePayload = await paymentDeunaNowPage.getPurchaseRequestPayload();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
          const cardIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni
            : (purchasePayload?.credit_card?.card_holder_dni ??
              purchasePayload?.billing_address?.identity_document);
          const billingIdentityInPayload = purchasePayload?.billing_address?.identity_document;

          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(
            cardIdentityDocument
          );
          expect(billingIdentityInPayload, `CHK: billingIdentityInPayload is not valid`).not.toBe(
            cardIdentityDocument
          );

          await ecommersePage.assertBackToHomeButtonIsVisible();
        });
      }
    );
  }
);
