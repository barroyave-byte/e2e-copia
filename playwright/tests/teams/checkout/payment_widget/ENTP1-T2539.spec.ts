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

// Colombia NIT has visualFormat '###.###.###-#' and submitValue: SubmitValue.format.
// When the merchant restricts to NIT only via supportedDocumentTypes, the dropdown
// behaves as a static prefix (no chevron, no selectable options).
// This test verifies that the visual mask is applied in the UI (900.123.456-7)
// but the payload is sent clean (9001234567).
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            CO: ['NIT'],
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
  '@regression Payment Widget - Card Pattern identity document submit value clean Colombia NIT',
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
      '@ENTP1-T2539 [IdentityDocumentInput] Card Pattern - Submit Value Clean Colombia: Verify NIT mask is applied in UI but payload is sent clean',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        // Colombia NIT validation rules:
        //   NIT: exactly 10 numeric digits | visualFormat: '###.###.###-#' | submitValue: format
        //   Valid NIT: 10 digits (e.g., 9001234567).
        //   Invalid NIT: fewer than 10 digits (e.g., 9 digits).
        const validNit = '9001234567'; // 10 digits — exactly the required length
        const invalidNit = '123456789'; // 9 digits — below min length of 10
        const expectedDisplayValue = '900.123.456-7'; // visual mask applied in the UI

        // The merchant configured only NIT, so IdentityDocumentInput behaves as single-type:
        // the dropdown button shows only the NIT prefix with no chevron icon, and clicking
        // the button does NOT open a list of other document type options.
        await test.step('Verify dropdown shows NIT as the only configured type — no chevron icon and clicking does not open additional options', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();

          // Verify the dropdown button is visible and shows the NIT prefix
          await expect(
            paymentDeunaNowPage.identityDocumentTypeDropdown,
            'CHK: identityDocumentTypeDropdown is visible'
          ).toBeVisible();
          await expect(
            paymentDeunaNowPage.identityDocumentTypeDropdown,
            'CHK: identityDocumentTypeDropdown not contains text NIT'
          ).toContainText('NIT');

          // Verify no chevron icon is rendered (isSingleOption = true hides the chevron)
          await expect(
            paymentDeunaNowPage.chevronDownIdentityDocument,
            'CHK: chevronDownIdentityDocument is not visible'
          ).not.toBeVisible();

          // Click the dropdown button and verify that no other CO document types appear
          // (CC, CE, PP should not be selectable since only NIT was configured)
          await paymentDeunaNowPage.assertAndClickIdentityDocumentTypeDropdown();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'CC'),
            'CHK: identityDocumentOptionLocator CC is not visible'
          ).not.toBeVisible();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'CE'),
            'CHK: identityDocumentOptionLocator CE is not visible'
          ).not.toBeVisible();
          await expect(
            paymentDeunaNowPage.getIdentityDocumentOptionLocator(countryCode, 'PP'),
            'CHK: identityDocumentOptionLocator PP is not visible'
          ).not.toBeVisible();
        });

        // Fills all card fields except document number so we can control it manually.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.openpayMastercardSuccessful,
            document_number: '',
          });
        });

        // Validates that typing an invalid NIT shows an error, and a valid NIT clears it.
        // NIT has a separator mask so expectedDisplayValue verifies the visual formatting.
        await test.step('Validate NIT invalid and valid formats and verify visual mask', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            invalidValue: invalidNit,
            validValue: validNit,
            expectedDisplayValue,
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

          // NIT visual format is '###.###.###-#' but the payload value is sent clean.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validNit);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be NIT`
          ).toBe('NIT');
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
