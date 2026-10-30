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

const configMerchant = new ConfigMerchant();

// Peru only has DNI as a document type, so the dropdown is disabled — it renders as a static
// prefix label rather than a clickable selector. The supportedDocumentTypes config below is
// included for consistency with other tests, even though DNI is the only option available.
const checkout_modules: CheckoutModule[] = [
  {
    name: 'CardPattern',
    props: {
      fields: [
        {
          name: 'identity_document',
          supportedDocumentTypes: {
            PE: ['DNI'],
          },
        },
      ],
    },
  },
];

const widgetGeneralsConfig = {
  checkout_modules,
};

test.describe(
  '@regression Payment Widget - Card Pattern identity document invalid format Peru',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    // Sets up merchant config, tokenizes a PE order and applies the checkout modules config once before all tests.
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('PE');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cybersourceProcessor_PE,
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
      '@ENTP1-T2531 [IdentityDocumentInput] Card Pattern - Invalid Format Peru: Verify DNI validation and successful payment with valid input',
      { tag: ['@team_enterprise', '@payment_widget', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const countryCode = 'PE';

        // Peru only defines DNI. The validation rules are:
        //   DNI: exactly 8 numeric digits | visualFormat: ######## (no separators, submitValue: clean)
        // Valid DNI: exactly 8 digits.
        // Invalid DNI: fewer than 8 digits (below the required length).
        const validDni = '12345678'; // exactly 8 digits → no separators (submitValue: clean)
        const invalidDni = '1234567'; // 7 digits — below min length of 8

        // Peru has only one document type (DNI), so the dropdown is disabled and shows only the
        // DNI prefix. We verify the field is visible and displays DNI but do NOT attempt to click
        // it or check for other options, unlike multi-document-type countries.
        await test.step('Open card payment form and verify dropdown shows DNI as the only (disabled) document type', async () => {
          await paymentDeunaNowPage.assertUserSeePaymentForm();
          await paymentDeunaNowPage.waitCardNumberInputIsVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toBeVisible();
          await expect(paymentDeunaNowPage.identityDocumentTypeDropdown).toContainText('DNI');
        });

        // Fills all card fields except document number so we can control it manually.
        await test.step('Fill card form without identity document', async () => {
          await paymentDeunaNowPage.fillCardForm({
            ...creditCardData.cybersourceVisaCardSuccessful,
            document_number: '',
          });
        });

        // Validates that typing an invalid DNI shows an error, and a valid DNI clears it.
        // No document type switching is needed since DNI is the only option for Peru.
        await test.step('Validate DNI invalid and valid formats', async () => {
          await validateDocumentFormat(paymentDeunaNowPage, countryCode, {
            invalidValue: invalidDni,
            validValue: validDni,
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

          // DNI has submitValue: 'clean', so the component sends the raw digits to the API.
          expect(cardIdentityInPayload, `CHK: cardIdentityInPayload is not valid`).toBe(validDni);
          expect(
            identityTypeInPayload,
            `CHK: identityTypeInPayload is not valid, it must be DNI`
          ).toBe('DNI');
        });
      }
    );
  }
);
