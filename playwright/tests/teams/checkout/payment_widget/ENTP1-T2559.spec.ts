import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ShippingDataPage } from '@pages/checkout/shipping_data/shippingDataPage';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// Uruguay CI has visualFormat '#.###.###-#'. With disableDocumentMask enabled,
// the input must keep the raw value without dots/dash while typing.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            UY: ['CI'],
          },
          disableDocumentMask: true,
        },
      ],
    },
  },
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
        {
          name: 'first_name',
          validation: {
            required: false,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: false,
          },
        },
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
          supportedDocumentTypes: {
            UY: ['CI'],
          },
          disableDocumentMask: true,
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

const countryCode = 'UY';

test.describe(
  '@regression Payment Widget - Card Pattern + Billing Pattern identity document disable document mask Uruguay',
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
      const merchant = await configMerchant.basicSetup(countryCode);
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder(countryCode, privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2559 [IdentityDocumentInput] Card Pattern + Billing Pattern - Disable Document Mask Uruguay: Verify CI keeps raw input value in card and billing forms and payment is successful',
      { tag: ['@team_enterprise', '@payment_widget'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const adminConnectionsPage = new AdminConnectionsPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const shippingDataPage = new ShippingDataPage(page);

        const validCi = '12345678';
        const invalidCi = '123456';

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes to connections', async () => {
          await adminHomePage.goToConnections();
        });

        await test.step('The user configure a new connection', async () => {
          await adminConnectionsPage.configureConnection(
            ConnectionsAvailable.dlocal,
            processorsConfig.dlocalProcessorUY
          );
        });

        await test.step('The user navigates to the payment screen', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Open card payment form and verify dropdown shows CI as the only document type', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toBeVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toContainText('CI');
          await expect(paymentDeunaNowPage.chevronDownIdentityDocument).not.toBeVisible();
        });

        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.dlocalVisaCardSuccessfulUY,
            document_number: '',
          });
        });

        await test.step('Validate CI invalid value and then valid value without mask formatting', async () => {
          await paymentDeunaNowPage.fillInputDocumentNumber(invalidCi, true);
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesSeeErrors('idDocumentError');

          await paymentDeunaNowPage.clearInputDocumentNumber();
          await paymentDeunaNowPage.fillInputDocumentNumber(validCi);
          await paymentDeunaNowPage.assertInputDocumentNumberHasValue(validCi);
          await paymentDeunaNowPage.blurInputDocumentNumber();
          await paymentDeunaNowPage.userDoesNotSeeErrors();
        });

        await test.step('Open Billing form and verify identity document input keeps raw value without mask formatting', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await expect(
            shippingDataPage.inputBillingIdentityDocument,
            'CHK: inputBillingIdentityDocument is not visible'
          ).toBeVisible();

          await shippingDataPage.inputBillingIdentityDocument.fill(validCi);
          await shippingDataPage.inputBillingIdentityDocument.blur();
          await expect(
            shippingDataPage.inputBillingIdentityDocument,
            'CHK: billing identity document should keep raw value without mask'
          ).toHaveValue(validCi);

          await paymentDeunaNowPage.clickToSaveFormButton();
          await paymentDeunaNowPage.assertUserSeePaymentForm();
        });

        await test.step('Click Pay and validate processed purchase and payload values', async () => {
          await paymentDeunaNowPage.clickPay();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

          const purchasePayload = await paymentDeunaNowPage.getPurchaseRequestPayload();
          const cardIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni
            : purchasePayload?.credit_card?.card_holder_dni;
          const billingIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.order?.billing_address?.identity_document
            : purchasePayload?.billing_address?.identity_document;

          const identityTypeInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni_type
            : (purchasePayload?.credit_card?.identity_document_type ??
              purchasePayload?.credit_card?.card_holder_dni_type ??
              purchasePayload?.billing_address?.identity_document_type ??
              purchasePayload?.payer?.identity_document_type);

          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validCi);
          expect(billingIdentityInPayload, `CHK: billingIdentityInPayload is not valid`).toBe(
            validCi
          );
          // V2Payment.buildIdentityCardInfo() (modular-checkout) writes the selected
          // document type into card_holder_dni_type. Uruguay only offers CI.
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be CI`
          ).toBe('CI');
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
