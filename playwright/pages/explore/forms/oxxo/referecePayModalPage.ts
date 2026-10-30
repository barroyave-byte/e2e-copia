import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { CommonsActions } from '@pages/commonActions';
import { CurrencyValues } from '@support/interfaces/currencyTypes';
import { OxxoTranslations } from '@support/translations/selectors/explore/oxxo/oxxoTranslations';
import DateTime from '@support/utils/datetime';
import { getTranslations } from '@translations/getTranslations';

export class ReferencePayModalPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: OxxoTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly labelAmountToPay: Locator;
  readonly canvasBarcode: Locator;
  readonly labelNumberCode: Locator;
  readonly buttonCopyNumberCode: Locator;
  readonly labelDeadLineDateCurrentTime: Locator;
  readonly buttonInstructionArrow: Locator;
  readonly labelPaymentInstructions0: Locator;
  readonly labelPaymentInstructions1: Locator;
  readonly labelPaymentInstructions2: Locator;
  readonly labelPaymentInstructions3: Locator;
  readonly labelPaymentInstructions4: Locator;
  readonly labelPaymentInstructions5: Locator;
  readonly buttonDownloadReference: Locator;
  readonly buttonPaymentDetails: Locator;
  readonly buttonOrderSummary: Locator;
  readonly buttonInstructionDownArrow: Locator;
  readonly labelPendingPayment: Locator;
  readonly labelErrorMsg: Locator;
  readonly labelErrorDescriptionMsg: Locator;
  readonly labelErrorCode: Locator;
  readonly buttonErrorBack: Locator;
  readonly selectOptionScreen: Locator;
  readonly labelHeaderTitle: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/oxxo', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.labelAmountToPay = page
      .getByTestId('voucher-header-price')
      .or(page.getByTestId('declarative-apm-header-amount-value'));
    this.canvasBarcode = page.locator('canvas');
    this.labelNumberCode = page.locator('[data-testid="reference_code"]');
    this.buttonCopyNumberCode = page.locator('[data-testid="copy_reference"]');
    this.labelDeadLineDateCurrentTime = page
      .getByTestId('voucher-due-date-date-limited-to-pay')
      .or(page.getByTestId('declarative-apm-expiration'));
    this.buttonInstructionArrow = page.locator('[data-testid="expand_more"]');
    this.buttonDownloadReference = page.locator('[data-testid="download_reference-button"]');
    this.buttonPaymentDetails = page
      .locator('[data-testid="see_payment_details-button"]')
      .or(page.locator('[data-testid="go_to_site-button"]'));
    this.buttonOrderSummary = page.locator('[data-testid="see_order_summary-button"]');
    this.buttonInstructionDownArrow = page.locator('[data-testid="expand_less"]');
    this.labelPaymentInstructions0 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-0"]')
    );
    this.labelPaymentInstructions1 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-1"]')
    );
    this.labelPaymentInstructions2 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-2"]')
    );
    this.labelPaymentInstructions3 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-3"]')
    );
    this.labelPaymentInstructions4 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-4"]')
    );
    this.labelPaymentInstructions5 = this.iframeZoidVisible.locator(
      this.page.locator('[data-testid="instruction-5"]')
    );
    this.labelPendingPayment = page.locator('[data-baseweb="typo-monoheadingxxlarge"]');
    this.labelErrorMsg = page.getByText(
      this.selectors.screenErrorGenerateReference.labelErrorTitle
    );
    this.labelErrorDescriptionMsg = page.getByText(
      this.selectors.screenErrorGenerateReference.labelErrorSubtitle
    );
    this.labelErrorCode = this.iframeZoidVisible.getByText('DP-7100');
    this.buttonErrorBack = this.iframeZoidVisible.locator('button:has-text("Volver")');
    this.selectOptionScreen = this.page.getByText(
      this.selectors.screenFormsExplore.labelChoosePaymentMethod
    );
    this.labelHeaderTitle = this.iframeZoidVisible
      .locator('[data-testid="voucher-header-title"]')
      .or(this.iframeZoidVisible.locator('[data-testid="declarative-apm-header-title"]'));
  }

  //Actions
  formatAmount(amountToBePaid: number, currencyCode: CurrencyValues): string {
    return `${currencyCode} ${(amountToBePaid / 100).toFixed(2)}`;
  }

  //Asserts
  async assertAmountToPay(formatedValue: string) {
    expect(
      this.iframeZoidVisible.locator(this.labelAmountToPay),
      'The select amount to pay is not visible'
    ).toBeVisible();
    const valueToPay = await this.iframeZoidVisible.locator(this.labelAmountToPay).textContent();
    expect(valueToPay).toBe(formatedValue);
    console.log(`[INFO] --> Value to pay is: "${valueToPay}" equals to "${formatedValue}"`);
  }

  async assertBarCodeIsDisplayed() {
    // Verificar que el div contenedor existe y es visible
    await expect(this.iframeZoidVisible.locator(this.canvasBarcode)).toBeVisible();
    console.log(`[INFO] --> Barcode is visible`);
  }

  async assertReferenceNumberIsDisplayed() {
    // Obtener el texto del elemento h2 con el código de referencia
    const referenceCode = await this.iframeZoidVisible.locator(this.labelNumberCode).textContent();
    expect(referenceCode).toBeTruthy();
    console.log(`[INFO] --> Código de referencia es visible, valido y diferente de vacío`);
  }

  async assertCopyButtonIsDisplayed() {
    // Verificar que el botón sea visible
    await expect(this.iframeZoidVisible.locator(this.buttonCopyNumberCode)).toBeVisible();
    await expect(this.iframeZoidVisible.locator(this.buttonCopyNumberCode)).toBeEnabled();
    console.log(`[INFO] --> Botón de copiar código de referencia es visible`);
  }

  async assertDeadlineDateCurrentTimeIsDisplayed() {
    // Obtener el texto completo de la etiqueta h2 que contiene la fecha, hora y país
    const dateTimeText = await this.iframeZoidVisible
      .locator(this.labelDeadLineDateCurrentTime)
      .textContent();

    // Legacy voucher: "dd/mm/yyyy hh:mm AM/PM Country" - the whole element's
    // text is exactly these 3 parts, so re-joining them must reproduce it.
    const legacyRegex = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}\s+[APM]{2})\s+(.+)/;
    const legacyMatch = dateTimeText.match(legacyRegex);

    if (legacyMatch) {
      const [, dateStr, timeStr, country] = legacyMatch;
      console.log(`[INFO] --> Fecha: ${dateStr}, Hora: ${timeStr}, País: ${country}`);
      expect(dateTimeText).toBe(`${dateStr} ${timeStr} ${country}`);
      return;
    }

    // Haruka (declarative-apm): the expiration block has no per-value testid,
    // so this locator resolves to the whole container - its text is the label
    // ("Fecha límite de pago") immediately followed by "dd/mm/yyyy HH:mm" (24h,
    // no AM/PM, no country). Just assert that date/time value is present.
    const harukaRegex = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/;
    const harukaMatch = dateTimeText.match(harukaRegex);

    if (!harukaMatch) {
      throw new Error('La fecha y hora no tienen el formato esperado.');
    }

    const [, dateStr, timeStr] = harukaMatch;
    console.log(`[INFO] --> Fecha: ${dateStr}, Hora: ${timeStr}`);
  }

  async getDeadlineDateIso() {
    const iframe = this.iframeZoidVisible;
    await this.ensureVisible(this.labelDeadLineDateCurrentTime, { iframe });

    const deadLineDate = await iframe.locator(this.labelDeadLineDateCurrentTime).textContent();

    // Legacy voucher: "dd/mm/yyyy hh:mm AM/PM Country"
    const legacyRegex = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}\s+[APM]{2})/;
    const legacyMatch = deadLineDate.match(legacyRegex);

    let dateStr: string;
    let timeStr: string;

    if (legacyMatch) {
      [, dateStr, timeStr] = legacyMatch;
    } else {
      // Haruka (declarative-apm): "dd/mm/yyyy HH:mm" (24h, no AM/PM, no country)
      const harukaRegex = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/;
      const harukaMatch = deadLineDate.match(harukaRegex);

      if (!harukaMatch) {
        throw new Error('La fecha y hora no tienen el formato esperado.');
      }

      [, dateStr, timeStr] = harukaMatch;
    }

    const [day, month, year] = dateStr.split('/');

    return DateTime.fromString(`${year}-${month}-${day} ${timeStr}`).toISOString();
  }

  async assertInstructionsTextIsDisplay() {
    await this.page.waitForTimeout(1500);
    await this.ensureVisibleToClick(
      this.buttonInstructionArrow,
      this.iframeZoidVisible,
      'Element buttonInstructionArrow not found'
    );
    await this.page.waitForTimeout(1500);
    for (let i = 0; i < 6; i++) {
      const instructionText = await this[`labelPaymentInstructions${i}`].textContent();
      const labelPaymentInstruction =
        this.selectors.screenReferencePayModal[`labelPaymentInstructions${i}`];

      expect(instructionText).toBe(labelPaymentInstruction);
    }
  }

  async assertInstructionsTextIsNotDisplay() {
    await this.ensureVisibleToClick(
      this.buttonInstructionDownArrow,
      this.iframeZoidVisible,
      'Element buttonInstructionArrow not found'
    );
    await this.page.waitForTimeout(1500);
    for (let i = 0; i <= 5; i++) {
      await expect(this[`labelPaymentInstructions${i}`]).not.toBeVisible();
    }
  }

  async assertDownloadingPaymentReference(textToVerify: string) {
    const download = await this.downloadReference();
    expect(download.url()).toBeTruthy();
    await this.assertContentDownloadedPdfFile(download, textToVerify);
  }

  async downloadReference() {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
    await this.ensureVisibleToClick(this.iframeZoidVisible.locator(this.buttonDownloadReference));
    const download = await downloadPromise;
    return download;
  }

  async goToPaymentDetails() {
    await this.ensureVisibleToClick(
      this.buttonPaymentDetails,
      this.iframeZoidVisible,
      'Element buttonPaymentDetails not found'
    );
  }

  async assertPaymentDetails(paymentDetailsUrl: string) {
    const paymentDetailsPagePromise = this.page.waitForEvent('popup');

    await this.goToPaymentDetails();
    const paymentDetailsPage = await paymentDetailsPagePromise;
    await paymentDetailsPage.waitForLoadState();

    await expect(paymentDetailsPage).toHaveURL(paymentDetailsUrl);
    await paymentDetailsPage.close();
  }

  async assertThankYouPage() {
    // Verificar que el botón de resumen de pedido sea visible
    await expect(this.iframeZoidVisible.locator(this.buttonOrderSummary)).toBeVisible();
    // Dar clic en el botón de resumen de pedido
    await this.ensureVisibleToClick(
      this.buttonOrderSummary,
      this.iframeZoidVisible,
      'Element buttonOrderSummary not found'
    );
    // Verificar que el texto de resumen de pedido sea visible
    await expect(this.labelPendingPayment).toBeVisible();
  }

  async assertErrorScreen() {
    await expect(this.iframeZoidVisible.locator(this.labelErrorMsg)).toBeVisible({
      timeout: 30000,
    });
    await expect(this.iframeZoidVisible.locator(this.labelErrorDescriptionMsg)).toBeVisible();
  }

  async assertErrorIdDisplayed() {
    await expect(this.labelErrorCode).toBeVisible();
  }

  async assertBackButtonDisplayed() {
    await expect(this.buttonErrorBack).toBeVisible();
  }

  async assertBackButtonWorks() {
    await this.iframeZoidVisible.locator(this.page.locator('div[data-testid="error"]')).isVisible();
    await this.ensureVisibleToClick(this.buttonErrorBack);
    await expect(this.selectOptionScreen).toBeVisible();
  }

  async assertHeaderTitle(title: string) {
    await expect(this.labelHeaderTitle).toHaveText(title);
  }

  async assertContentDownloadedPdfFile(download: any, textToVerify: string): Promise<void> {
    // Guardar el PDF temporalmente en el sistema
    const downloadPath = path.join(__dirname, 'payment_reference.pdf');
    await download.saveAs(downloadPath);

    // Leer el archivo PDF
    const dataBuffer = fs.readFileSync(downloadPath);
    // pdf-parse bundles pdf.js 1.10, which intermittently fails with "bad XRef entry" on
    // Node 24 when handed a Buffer; a plain Uint8Array copy parses reliably.
    const pdfData = await pdfParse(new Uint8Array(dataBuffer));

    // Buscar las frases dentro del contenido extraído del PDF
    const pdfText = pdfData.text;
    expect(pdfText).toContain(textToVerify);

    // Elimina el archivo PDF temporal
    fs.unlinkSync(downloadPath);
    console.log(`[INFO] --> Archivo PDF eliminado posterior a la prueba: ${downloadPath}`);
  }
}
