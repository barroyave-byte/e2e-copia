import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { validateDocumentFormat } from './share/validateDocumentFormat';
import { isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

// Colombia natively supports multiple document types (CC, NIT, CE, PP, etc.).
// Here the merchant restricts to a single type (CC) via supportedDocumentTypes.
// This verifies that the IdentityDocumentInput behaves as a static prefix (no dropdown)
// even when the country has more types available in core.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            CO: ['CC'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

const countryCode = 'CO';

test.describe(
  '@regression Payment Widget - Card Pattern identity document single type configuration Colombia',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a CO order and applies the checkout modules config once before all tests.
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
        processorsConfig.openPayProcessorCO,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2538 [IdentityDocumentInput] Card Pattern - Single Document Type Configuration: Verify selector behavior and successful payment when merchant configures only one document type',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        // Colombia CC validation rules:
        //   CC: 6–10 numeric digits | no visual separator (submitValue: clean)
        // Valid CC: 6–10 digits (e.g., 8 digits).
        // Invalid CC: fewer than 6 digits (below required minimum length).
        const validCc = '12345678'; // 8 digits — within the valid range of 6–10
        const invalidCc = '12345'; // 5 digits — below min length of 6

        // Colombia has multiple native doc types, but the merchant configured only CC.
        // This means the IdentityDocumentInput should behave like a single-type country:
        // the dropdown button shows only the CC prefix with no chevron icon, and clicking
        // the button does NOT open a list of other document type options.
        await test.step('Verify dropdown shows CC as the only configured type — no chevron icon and clicking does not open additional options', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();

          // Verify the dropdown button is visible and shows the CC prefix
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toBeVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toContainText('C.C.');

          // Verify no chevron icon is rendered (isSingleOption = true hides the chevron)
          await expect(paymentDeunaNowPage.chevronDownIdentityDocument).not.toBeVisible();

          // Click the dropdown button and verify that no other CO document types appear
          // (NIT, CE, PP should not be selectable since only CC was configured)
          await paymentDeunaNowPage.assertAndClickIdentityDocumentTypeDropdown();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'NIT')
          ).not.toBeVisible();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'CE')
          ).not.toBeVisible();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'PP')
          ).not.toBeVisible();
        });

        // Fills all card fields except document number so we can control it manually.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.openpayMastercardSuccessful,
            document_number: '',
          });
        });

        // Validates that typing an invalid CC shows an error, and a valid CC clears it.
        // CC has no separator mask so no expectedDisplayValue is needed.
        await test.step('Validate CC invalid and valid formats', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            invalidValue: invalidCc,
            validValue: validCc,
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

          // CC has submitValue: 'clean' and no separator mask, so the raw digits are sent.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validCc);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be CC`
          ).toBe('CC');
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
