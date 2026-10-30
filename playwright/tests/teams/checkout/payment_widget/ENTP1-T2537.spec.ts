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
import { validateDocumentFormat } from './share/validateDocumentFormat';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';

const configMerchant = new ConfigMerchant();

// United States only has ID as a document type, so the dropdown is disabled — it renders as a static
// prefix label rather than a clickable selector. The supportedDocumentTypes config below is
// included for consistency with other tests, even though ID is the only option available.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            US: ['ID'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

const countryCode = 'US';

test.describe(
  '@regression Payment Widget - Card Pattern identity document invalid format United States',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a US order, registers the Elavon processor via API
    // (Elavon has no admin UI connection page), and applies the checkout modules config once before all tests.
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
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.elavonProcessorSettlement,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2537 [IdentityDocumentInput] Card Pattern - United States: Verify ID field accepts alphanumeric input and payment is successful',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        // United States only defines ID. The validation rules are:
        //   ID: 1–20 alphanumeric characters | no visual format (no mask) | submitValue: clean
        // Valid ID: any alphanumeric string between 1 and 20 characters.
        // Invalid ID: empty string (below min length of 1).
        const validId = 'ABC123456'; // 9 alphanumeric chars — valid (no separators, sent as-is)
        const invalidId = ''; // empty — below min length of 1

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        // United States has only one document type (ID), so the dropdown is disabled and shows only the
        // ID prefix. We verify the field is visible and displays ID but do NOT attempt to click
        // it or check for other options, unlike multi-document-type countries.
        await test.step('Open card payment form and verify dropdown shows ID as the only (disabled) document type', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toBeVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toContainText('ID');
        });

        // Fills all card fields except document number so we can control it manually.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.elavonVisaSuccessfull,
            document_number: '',
          });
        });

        // Validates that leaving the ID field empty shows an error, and filling a valid value clears it.
        // ID has no visual mask, so no expectedDisplayValue is needed.
        // No document type switching is needed since ID is the only option for United States.
        await test.step('Validate ID invalid and valid formats', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            invalidValue: invalidId,
            validValue: validId,
          });
        });

        await test.step('Click Pay and validate processed purchase and payload values', async () => {
          await paymentDeunaNowPage.clickPay();
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);

          const purchasePayload = await paymentDeunaNowPage.getPurchaseRequestPayload();
          const cardIdentityInPayload = isV2PurchaseRequest(purchasePayload)
            ? purchasePayload?.payment_source?.card_info?.card_holder_dni
            : purchasePayload?.credit_card?.card_holder_dni;

          // Different processors place the identity type in different payload fields.
          // We use fallback chaining to support all known processor response shapes.
          const identityTypeInPayload = isV2PurchaseRequest(purchasePayload)
            ? (purchasePayload?.payment_source?.card_info?.card_holder_dni_type ?? '')
            : (purchasePayload?.credit_card?.identity_document_type ??
              purchasePayload?.credit_card?.card_holder_dni_type ??
              purchasePayload?.billing_address?.identity_document_type ??
              purchasePayload?.payer?.identity_document_type);

          // ID has submitValue: 'clean' and no mask, so the raw value is sent as-is.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validId);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be ID`
          ).toBe('ID');
        });
      }
    );
  }
);
