import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

export class OrderSummaryPage {
  readonly page: Page;
  readonly selectors: DeunanowTranslations;
  readonly svgBarcode: Locator;
  readonly referenceNumberORderSumary: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('deunanow', languageCode);
    this.svgBarcode = this.page.locator('svg').nth(3);
    this.referenceNumberORderSumary = this.page.locator('[data-baseweb="typo-paragraphxsmall"]').filter({ hasText: /^\d[\d\s]+$/ });
  }

  //Asserts
  async assertDateAndTimeSumaryOrder() {
    // Localizar el valor buscando el p hermano siguiente al label exacto
    const elementText = await this.page
      .getByText('Fecha límite de pago', { exact: true })
      .locator('xpath=following-sibling::p[1]')
      .textContent();

    // Expresión regular usando \s+ para tolerar espacios normales y non-breaking spaces
    const dateTimeRegex = /(\d{2}\/\d{2}\/\d{4})\s+a\s+l[ae]s\s+(\d{2}:\d{2})\s+(AM|PM)/;

    const normalizedText = (elementText ?? '').replace(/\u00a0/g, ' ');
    const match = normalizedText.match(dateTimeRegex);

    if (match) {
      const date = match[1]; // "25/03/2026"
      const time = `${match[2]} ${match[3]}`; // "11:59 PM"

      expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(time).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
    } else {
      throw new Error(`No se pudo extraer la fecha y hora. Texto recibido: "${elementText}"`);
    }
  }

  async assertBarcodeOrderSumaryDisplayed() {
    // Verificar que el código de barras del resumen de la orden sea visible
    await expect(this.svgBarcode).toBeVisible();
  }

  async assertReferenceNumberOrderSumaryDisplayed() {
    // Verificar que el número de referencia del resumen de la orden sea visible
    await expect(this.referenceNumberORderSumary).toBeVisible();
  }
}
