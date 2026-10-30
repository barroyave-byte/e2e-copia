import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { formatAmount } from './utils/formatAmount';
import { normalizeAmountValue } from './utils/normalizeAmount';
import type { LocaleData, Product } from '@support/interfaces/adminPaymentLink';
import { DATA_TEST_IDS, MODAL_DATA_TEST_IDS } from './constants';

export const PRODUCT_DATA_TEST_IDS = {
  productName: 'product-name',
  productAmount: 'product-amount',
  productCurrency: 'product-currency',
};

export class AdminPaymentLinkFormPage {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  readonly labelTitleCreatePaymentLink: Locator;
  readonly loader: Locator;
  readonly inputPaymentLinkName: Locator;

  // Product form
  readonly inputProductName: Locator;
  readonly inputTotalAmount: Locator;
  readonly selectCurrency: Locator;
  readonly buttonSaveProduct: Locator;

  getSavedProductNameLocator(productName: string): Locator {
    return this.page.getByTestId(`${PRODUCT_DATA_TEST_IDS.productName}-${productName}`);
  }
  getSavedProductAmountLocator(productName: string): Locator {
    return this.page.getByTestId(`${PRODUCT_DATA_TEST_IDS.productAmount}-${productName}`);
  }
  getSavedProductCurrencyLocator(productName: string): Locator {
    return this.page.getByTestId(`${PRODUCT_DATA_TEST_IDS.productCurrency}-${productName}`);
  }

  // Options
  readonly checkboxTaxes: Locator;
  readonly checkboxShipping: Locator;
  readonly checkboxDueDate: Locator;
  readonly checkboxMaxCompletedPurchases: Locator;
  readonly inputTaxAmount: Locator;
  readonly inputShippingAmount: Locator;
  readonly inputDueDate: Locator;
  readonly inputMaxCompletedPurchasesLimit: Locator;

  // Advanced configuration
  readonly buttonAdvancedConfigurationAccordion: Locator;
  readonly checkboxPaymentRetries: Locator;
  readonly inputPaymentRetries: Locator;

  // Footer
  readonly buttonFooterCancel: Locator;
  readonly buttonFooterCreatePaymentLink: Locator;

  // Confirmation Modal
  readonly modalConfirmation: Locator;
  readonly labelModalTitle: Locator;
  readonly labelModalTotalAmount: Locator;
  readonly inputModalPaymentLink: Locator;
  readonly buttonModalCopyLink: Locator;
  readonly buttonModalClose: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);

    this.labelTitleCreatePaymentLink = page.getByRole('heading', {
      name: `${this.selectors.screenPaymentLink.labelTitleCreatePaymentLink}`,
    });
    this.loader = page.locator('.MuiCircularProgress-root');

    this.inputPaymentLinkName = page.getByTestId(DATA_TEST_IDS.INPUT_PAYMENT_LINK_NAME);
    // Add product form
    this.inputProductName = page.getByTestId(DATA_TEST_IDS.INPUT_PRODUCT_NAME);
    this.inputTotalAmount = page.getByTestId(DATA_TEST_IDS.INPUT_TOTAL_AMOUNT);
    this.selectCurrency = page.getByTestId('payment-link-form-select-currency');
    this.buttonSaveProduct = page.getByTestId(DATA_TEST_IDS.BUTTON_SAVE_PRODUCT);

    // Options
    this.checkboxTaxes = page.getByTestId(DATA_TEST_IDS.TAXES_CHECKBOX);
    this.checkboxShipping = page.getByTestId(DATA_TEST_IDS.SHIPPING_CHECKBOX);
    this.checkboxDueDate = page.getByTestId(DATA_TEST_IDS.DUE_DATE_CHECKBOX);
    this.checkboxMaxCompletedPurchases = page.getByTestId(
      DATA_TEST_IDS.SUCCESSFUL_PAYMENT_LIMIT_CHECKBOX
    );
    this.inputTaxAmount = page.getByTestId(DATA_TEST_IDS.INPUT_TAX_AMOUNT);
    this.inputShippingAmount = page.getByTestId(DATA_TEST_IDS.INPUT_SHIPPING_AMOUNT);
    this.inputDueDate = page.getByTestId(DATA_TEST_IDS.INPUT_DUE_DATE);
    this.inputMaxCompletedPurchasesLimit = page
      .getByTestId(DATA_TEST_IDS.INPUT_MAX_COMPLETED_PURCHASES_LIMIT)
      .locator('input');

    // Advanced configuration
    this.buttonAdvancedConfigurationAccordion = page.getByTestId(
      DATA_TEST_IDS.BUTTON_ADVANCED_CONFIG_ACCORDION
    );
    this.checkboxPaymentRetries = page.getByTestId(DATA_TEST_IDS.PAYMENT_RETRIES_CHECKBOX);
    this.inputPaymentRetries = page
      .getByTestId(DATA_TEST_IDS.INPUT_PAYMENT_RETRIES)
      .locator('input');

    // Footer
    this.buttonFooterCancel = page.getByTestId(DATA_TEST_IDS.FOOTER_BUTTON_CANCEL);
    this.buttonFooterCreatePaymentLink = page.getByTestId(DATA_TEST_IDS.FOOTER_BUTTON_CREATE);

    // Confirmation Modal
    this.modalConfirmation = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_CONTAINER);
    this.labelModalTitle = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_TITLE);
    this.labelModalTotalAmount = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_TOTAL_AMOUNT);
    this.inputModalPaymentLink = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_INPUT_LINK);
    this.buttonModalCopyLink = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_BUTTON_COPY);
    this.buttonModalClose = page.getByTestId(MODAL_DATA_TEST_IDS.MODAL_BUTTON_CLOSE);
  }

  // Actions
  async fillProductLinkName(name: string) {
    await this.inputPaymentLinkName.fill(name);
  }

  async addProduct({ productName, productAmount }: { productName: string; productAmount: string }) {
    await this.inputProductName.fill(productName);
    await this.page.waitForTimeout(500);

    await this.inputTotalAmount.fill(productAmount);
    await this.page.waitForTimeout(500);

    await this.buttonSaveProduct.click();
  }

  async toggleTaxesCheckbox() {
    await this.checkboxTaxes.click();
  }

  async toggleShippingCheckbox() {
    await this.checkboxShipping.click();
  }

  async toggleDueDateCheckbox() {
    await this.checkboxDueDate.click();
  }

  async togglePurchaseAttemptsLimitCheckbox() {
    await this.checkboxPaymentRetries.click();
  }

  async toggleMaxCompletedPurchasesCheckbox() {
    await this.checkboxMaxCompletedPurchases.click();
  }

  async fillTaxAmount(amount: string) {
    await this.inputTaxAmount.fill(amount);
    await this.page.waitForTimeout(500);
  }

  async fillShippingAmount(amount: string) {
    await this.inputShippingAmount.fill(amount);
    await this.page.waitForTimeout(500);
  }

  async fillMaxCompletedPurchasesLimit(limit: string) {
    await this.inputMaxCompletedPurchasesLimit.fill(limit);
    await this.page.waitForTimeout(500);
  }

  async fillPaymentRetriesLimit(limit: string) {
    await this.inputPaymentRetries.fill(limit);
    await this.page.waitForTimeout(500);
  }

  async addTaxes(taxAmount: string) {
    await this.toggleTaxesCheckbox();
    await this.fillTaxAmount(taxAmount);
  }

  async addShipping(shippingAmount: string) {
    await this.toggleShippingCheckbox();
    await this.fillShippingAmount(shippingAmount);
  }

  async toggleAdvancedConfigurationAccordion() {
    await this.buttonAdvancedConfigurationAccordion.click();
  }

  async addPaymentRetriesLimit(limit: string) {
    await this.togglePurchaseAttemptsLimitCheckbox();
    await this.fillPaymentRetriesLimit(limit);
  }

  async addMaxCompletedPurchasesLimit(limit: string) {
    await this.toggleMaxCompletedPurchasesCheckbox();
    await this.fillMaxCompletedPurchasesLimit(limit);
  }

  async addSeveralProducts(products: Product[]) {
    for (const product of products) {
      await this.addProduct(product);
    }
  }

  async submitForm() {
    await this.buttonFooterCreatePaymentLink.click();
  }

  async cancelForm() {
    await this.buttonFooterCancel.click();
  }

  async copyModalPaymentLink() {
    await this.buttonModalCopyLink.click();
  }

  async closeModal() {
    await Promise.all([
      this.page.waitForURL(/\/payment-link\/[^/?#]+$/),
      this.buttonModalClose.click(),
    ]);
    await expect(this.modalConfirmation).toBeHidden();
  }

  // Assertions
  async assertToBeInCreatePaymentLinkPage() {
    await expect(this.labelTitleCreatePaymentLink).toBeVisible();
  }

  async assertPaymentLinkNameFilled(expectedName: string) {
    const filledName = await this.inputPaymentLinkName.inputValue();
    expect(filledName).toBe(expectedName);
  }

  async assertProductSavedCorrectly({
    productName,
    productAmount,
    localeData,
  }: {
    productName: string;
    productAmount: string;
    localeData: LocaleData;
  }) {
    const savedProductNameLocator = this.getSavedProductNameLocator(productName);
    const savedProductAmountLocator = this.getSavedProductAmountLocator(productName);

    const formattedAmount = formatAmount({
      value: parseFloat(productAmount),
      localeData,
    });

    await expect(savedProductNameLocator).toHaveText(productName);
    await expect(savedProductAmountLocator).toHaveText(formattedAmount);
  }

  async assertSeveralProducts({
    products,
    localeData,
  }: {
    products: Product[];
    localeData: LocaleData;
  }) {
    await Promise.all(
      products.map(({ productName, productAmount }) =>
        this.assertProductSavedCorrectly({
          productName,
          productAmount,
          localeData,
        })
      )
    );
  }

  async assertTaxesAdded(taxAmount: string) {
    const inputValue = await this.inputTaxAmount.inputValue();
    const normalizedInputValue = normalizeAmountValue(inputValue);
    const normalizedTaxAmount = normalizeAmountValue(taxAmount);

    expect(normalizedInputValue).toBe(normalizedTaxAmount);
  }

  async assertShippingAdded(shippingAmount: string) {
    const inputValue = await this.inputShippingAmount.inputValue();
    const normalizedInputValue = normalizeAmountValue(inputValue);
    const normalizedShippingAmount = normalizeAmountValue(shippingAmount);

    expect(normalizedInputValue).toBe(normalizedShippingAmount);
  }

  async assertPurchaseAttemptsLimitAdded(limit: string) {
    const inputValue = await this.inputPaymentRetries.inputValue();
    expect(inputValue).toBe(limit);
  }

  async assertMaxCompletedPurchasesLimitAdded(limit: string) {
    const inputValue = await this.inputMaxCompletedPurchasesLimit.inputValue();
    expect(inputValue).toBe(limit);
  }

  async assertLoaderVisible() {
    await expect(this.loader).toBeVisible();
  }

  async assertPaymentLinkCreationModal({
    expectedAmount,
    localeData,
  }: {
    expectedAmount: string;
    localeData: LocaleData;
  }) {
    await expect(this.modalConfirmation).toBeVisible();
    await expect(this.labelModalTitle).toBeVisible();

    const formattedAmount = formatAmount({
      value: parseFloat(expectedAmount),
      localeData,
    });

    await expect(this.labelModalTotalAmount).toHaveText(
      `${this.selectors.screenPaymentLink.labelModalTotalAmount} ${formattedAmount}`
    );
    await expect(this.buttonModalCopyLink).toBeVisible();
    await expect(this.buttonModalClose).toBeVisible();
  }
}
