import { expect, Locator, Page } from '@playwright/test';
import { getTranslations } from '@translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

export class ThankYouPage {
  readonly page: Page;
  readonly selectors: DeunanowTranslations;
  readonly rowPaymentId: Locator;
  readonly rowTransactionIdDEUNA: Locator;
  readonly rowTransactionId: Locator;
  readonly rowPaymentDate: Locator;
  readonly rowAuthorizationCode: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('deunanow', languageCode);
    this.rowTransactionIdDEUNA = page.locator('#row-transactionId-DEUNA');
    this.rowPaymentDate = page.locator('#row-paymentDate');
    this.rowTransactionId = page.locator('#row-transactionId');
    this.rowPaymentId = page.locator('#row-paymentId');
    this.rowAuthorizationCode = page.locator('#row-authorizationCode');
  }

  async assertPaymentNumberVisible(orderId: string) {
    const paymentNumber = this.page.getByTestId('row-paymentId-value')
    await expect(paymentNumber).toHaveText(orderId, { timeout: 5000 })
    await expect(paymentNumber).toBeVisible({ timeout: 5000 });
    return paymentNumber;
  }

  async assertTransactionNumberVisible(transactionId: string) {
    const transactionNumber = this.page.getByTestId('row-transactionId-value')
    await expect(transactionNumber).toHaveText(transactionId, { timeout: 5000 });
    return transactionNumber;
  }

  async assertPaymentDetails(orderId: string, transactionId: string) {
    const paymentNumber = await this.assertPaymentNumberVisible(orderId);
    const transactionNumber = await this.assertTransactionNumberVisible(transactionId);
    return { paymentNumber, transactionNumber };
  }
}
