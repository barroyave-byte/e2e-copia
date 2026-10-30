import { expect } from '@playwright/test';
import { test } from '@support/fixtures';
import { DaviplataPaymentFlowUntilOTP } from './share/daviplataPaymentFlowUntilOtp';
import { DaviplataFormPage } from '@pages/explore/forms/daviplataFormPage';

const daviplataPaymentFlowUntilOtp = new DaviplataPaymentFlowUntilOTP();

test.describe(
  '@regression [IdentityDocumentInput] Daviplata CO - Validate CC, CE, TI dropdown options and purchase with CE',
  {
    tag: ['@checkout', '@checkout_base', '@payment_widget', '@team_payment_integration'],
  },
  () => {
    test.use({ viewport: { width: 1400, height: 900 } });
    // Sets up merchant config CO, creates daviplata processor and tokenizes a CO order once before all tests.
    daviplataPaymentFlowUntilOtp.globalSetup();

    // Navigates to the Formularios widget before each test.
    daviplataPaymentFlowUntilOtp.testSetup();

    test(
      '@ENTP1-T2557 [IdentityDocumentInput][Daviplata][CO] Validate non-default document type (CE) and dropdown options',
      { tag: ['@team_payment_integration', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const countryCode = 'CO';

        // Daviplata CO supports CC, CE, and TI by default (no checkout_modules configuration needed).
        // CC is the default selection. This test switches to CE and verifies the full purchase flow.
        //   CE: 6–7 numeric digits | no separator (submitValue: clean)
        const validCe = '1234567'; // 7 digits — within the valid range of 6–7

        // Access the payment widget iframe — all IdentityDocumentInput locators live inside it.
        const daviplataFormPage = new DaviplataFormPage(page);
        const iframe = daviplataFormPage.iframePaymentWidget;
        const { identityDropdown, identityInput } = daviplataFormPage;

        const { daviplataFormPage: formPage } = await daviplataPaymentFlowUntilOtp.run({
          page,
          asserts: {
            // Replaces the default document-number visibility check.
            // Verifies the dropdown is visible, CC is the default, and CC/CE/TI are the only options.
            documentNumberToBeVisible: async () => {
              await expect(daviplataFormPage.iframeLocator(identityDropdown)).toBeVisible();
              await expect(daviplataFormPage.iframeLocator(identityDropdown)).toContainText('C.C.');

              await daviplataFormPage.iframeLocator(identityDropdown).click();
              await expect(iframe.getByTestId(`dropdown-item-${countryCode}_CC`)).toBeVisible();
              await expect(iframe.getByTestId(`dropdown-item-${countryCode}_CE`)).toBeVisible();
              await expect(iframe.getByTestId(`dropdown-item-${countryCode}_TI`)).toBeVisible();
              // Close dropdown without selecting — next step handles the switch.
              await daviplataFormPage.iframeLocator(identityDropdown).click();
            },
          },
          onFillDocumentNumber: async () => {
            // Switch from CC to CE and fill a valid CE document number.
            await daviplataFormPage.iframeLocator(identityDropdown).click();
            await iframe.getByTestId(`dropdown-item-${countryCode}_CE`).click();
            await expect(daviplataFormPage.iframeLocator(identityDropdown)).toContainText('C.E.');

            await daviplataFormPage.iframeLocator(identityInput).fill(validCe);
          },
        });

        // Validate the purchase request payload contains CE as document type and the clean CE number.
        const purchaseResponse = await formPage.purchaseResponse;
        const requestBody = purchaseResponse.request().postDataJSON();

        // Daviplata may use different payload shapes depending on implementation.
        // Use fallback chaining to support all known request structures.
        const identityDocumentInPayload = requestBody?.billing_address?.identity_document;
        const identityTypeInPayload = requestBody?.billing_address?.identity_document_type;

        // CE has submitValue: 'clean', so raw digits are sent without formatting separators.
        expect(identityDocumentInPayload).toBe(validCe);
        expect(identityTypeInPayload).toBe('CE');
      }
    );
  }
);
