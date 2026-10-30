import { expect } from '@playwright/test';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

export async function assertIdentityDocumentDropdownOptions(
  paymentPage: PaymentDeunaNowPage,
  countryCode: string,
  documentTypes: Record<string, string>
): Promise<void> {
  await paymentPage.assertUserSeePaymentForm();
  await paymentPage.waitCardNumberInputIsVisible();

  await expect(
    paymentPage.identityDocumentTypeDropdown,
    `CHK: identityDocumentTypeDropdown for countryCode: ${countryCode} is not visible`
  ).toBeVisible();

  await paymentPage.assertAndClickIdentityDocumentTypeDropdown();

  for (const documentType of Object.values(documentTypes)) {
    const option = paymentPage.getIdentityDocumentOptionLocator(countryCode, documentType);
    await expect(
      option,
      `CHK: identityDocumentOptionLocator for countryCode: ${countryCode} - ${documentType} is not visible`
    ).toBeVisible();
  }

  // Keep deterministic UI state for following steps (card fields filling/validation).
  await paymentPage.closeIdentityDocumentTypeDropdownIfOpen();
}

export async function validateDocumentFormat(
  paymentPage: PaymentDeunaNowPage,
  countryCode: string,
  options: {
    switchTo?: string;
    invalidValue: string;
    validValue: string;
    // Expected value shown in the input after the mask is applied.
    // Only set for document types that have a visual format with separators
    // (e.g., DNI '12345678' → '12.345.678', CPF '11144477735' → '111.444.777-35').
    // Leave undefined for types with no separators (PASSPORT, CC, CE, etc.).
    expectedDisplayValue?: string;
  }
): Promise<void> {
  if (options.switchTo) {
    await paymentPage.selectIdentityDocumentType(countryCode, options.switchTo);
    await paymentPage.assertInputDocumentNumberIsEmpty();
  }

  await paymentPage.fillInputDocumentNumber(options.invalidValue, true);
  await paymentPage.blurInputDocumentNumber();
  await paymentPage.userDoesSeeErrors('idDocumentError');

  await paymentPage.clearInputDocumentNumber();
  await paymentPage.fillInputDocumentNumber(options.validValue);

  // When a document type has a visual mask (e.g., ###.###.###-##), typing the raw digits
  // causes the component to display the formatted value in the input field.
  // We assert this to verify the mask is correctly applied by the IdentityDocumentInput component.
  if (options.expectedDisplayValue) {
    await paymentPage.assertInputDocumentNumberHasValue(options.expectedDisplayValue);
  }

  await paymentPage.blurInputDocumentNumber();
  await paymentPage.userDoesNotSeeErrors();
}
