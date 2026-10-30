import { BrowserContext, expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { formatAmount } from './utils/formatAmount';
import type {
  Amounts,
  CustomUrls,
  LocaleData,
  Product,
} from '@support/interfaces/adminPaymentLink';
import { getTranslations } from '@support/translations/getTranslations';
import { DETAILS_PAGE_DATA_TEST_IDS } from './constants';

const DETAILS_DATA_TEST_IDS = {
  templateName: 'details-paymentLink-name',
  paymentLink: 'details-payment-link',
  paymentLinkCopyButton: 'details-payment-link-copy-button',
  expiresAt: 'details-expires-at',
  paymentMethods: 'details-payment-methods',
  paymentRetries: 'details-max-payment-retries',
  maxCompletedPurchases: 'details-max-completed-purchases',
  status: 'details-status',
  successUrl: 'details-success-url',
  pendingUrl: 'details-pending-url',
  errorUrl: 'details-error-url',
  subtotal: 'details-subtotal',
  taxAmount: 'details-tax-amount',
  shippingAmount: 'details-shipping-amount',
  discountAmount: 'details-discount-amount',
  totalAmount: 'details-total-amount',
};

const DETAILS_PRODUCT_DATA_TEST_IDS = {
  productName: 'details-product-name',
  productAmount: 'details-product-amount',
};

const EMPTY_CUSTOM_URL = '-';

export class AdminPaymentLinkDetailsPage {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  readonly labelDetailsPageDescription: Locator;
  readonly labelTemplateName: Locator;
  readonly labelPaymentLink: Locator;
  readonly labelExpiresAt: Locator;
  readonly labelMaxCompletedPurchases: Locator;
  readonly labelPaymentMethods: Locator;
  readonly buttonCopyPaymentLink: Locator;
  readonly labelPaymentRetries: Locator;
  readonly labelSuccessUrl: Locator;
  readonly labelPendingUrl: Locator;
  readonly labelErrorUrl: Locator;
  readonly labelSubtotal: Locator;
  readonly labelTaxAmount: Locator;
  readonly labelShippingAmount: Locator;
  readonly labelDiscountAmount: Locator;
  readonly labelTotalAmount: Locator;

  getSavedProductNameLocator(productName: string): Locator {
    return this.page.getByTestId(`${DETAILS_PRODUCT_DATA_TEST_IDS.productName}-${productName}`);
  }
  getSavedProductAmountLocator(productName: string): Locator {
    return this.page.getByTestId(`${DETAILS_PRODUCT_DATA_TEST_IDS.productAmount}-${productName}`);
  }

  readonly buttonEdit: Locator;
  readonly buttonGoBack: Locator;
  readonly orderIdCells: Locator;

  getOrderRowLocator(orderId: string): Locator {
    return this.page.getByRole('row', { name: `${orderId}` }).first();
  }

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);

    this.labelDetailsPageDescription = page.getByTestId(
      DETAILS_PAGE_DATA_TEST_IDS.DESCRIPTION_SECTION
    );

    // Payment link details
    this.labelTemplateName = page.getByTestId(DETAILS_DATA_TEST_IDS.templateName);
    this.labelPaymentLink = page.getByTestId(DETAILS_DATA_TEST_IDS.paymentLink);
    this.labelExpiresAt = page.getByTestId(DETAILS_DATA_TEST_IDS.expiresAt);
    this.labelPaymentMethods = page.getByTestId(DETAILS_DATA_TEST_IDS.paymentMethods);
    this.labelMaxCompletedPurchases = page.getByTestId(DETAILS_DATA_TEST_IDS.maxCompletedPurchases);
    this.labelPaymentRetries = page.getByTestId(DETAILS_DATA_TEST_IDS.paymentRetries);
    this.labelSuccessUrl = page.getByTestId(DETAILS_DATA_TEST_IDS.successUrl);
    this.labelPendingUrl = page.getByTestId(DETAILS_DATA_TEST_IDS.pendingUrl);
    this.labelErrorUrl = page.getByTestId(DETAILS_DATA_TEST_IDS.errorUrl);
    this.labelSubtotal = page.getByTestId(DETAILS_DATA_TEST_IDS.subtotal);
    this.labelTaxAmount = page.getByTestId(DETAILS_DATA_TEST_IDS.taxAmount);
    this.labelShippingAmount = page.getByTestId(DETAILS_DATA_TEST_IDS.shippingAmount);
    this.labelDiscountAmount = page.getByTestId(DETAILS_DATA_TEST_IDS.discountAmount);
    this.labelTotalAmount = page.getByTestId(DETAILS_DATA_TEST_IDS.totalAmount);
    this.buttonCopyPaymentLink = page.getByTestId(DETAILS_DATA_TEST_IDS.paymentLinkCopyButton);

    // Orders table
    this.orderIdCells = page.locator(
      `[data-testid^="${DETAILS_PAGE_DATA_TEST_IDS.ORDERS_TABLE}-cell-order-"]`
    );

    // Buttons
    this.buttonEdit = page.getByTestId(DETAILS_PAGE_DATA_TEST_IDS.BUTTON_EDIT);
    this.buttonGoBack = page.getByTestId(DETAILS_PAGE_DATA_TEST_IDS.FOOTER_GO_BACK_BUTTON);
  }

  // Actions
  async clickEditButton() {
    await this.buttonEdit.click();
  }

  async clickCopyInformationButton() {
    await this.buttonCopyPaymentLink.click();
  }

  async clickGoBackButton() {
    await this.buttonGoBack.click();
  }

  // Assertions
  async assertToBeInDetailsPage() {
    await this.page.waitForURL(/\/payment-link\/[^/?#]+$/);
    await expect(this.buttonGoBack).toBeVisible();
  }

  async assertLinkDetails({
    templateName,
    paymentRetries,
    maxCompletedPurchasesLimit,
    customUrls = {
      successUrl: EMPTY_CUSTOM_URL,
      pendingUrl: EMPTY_CUSTOM_URL,
      errorUrl: EMPTY_CUSTOM_URL,
    },
  }: {
    templateName: string;
    paymentRetries?: string;
    maxCompletedPurchasesLimit?: string;
    customUrls?: CustomUrls;
  }) {
    const { successUrl = '', pendingUrl = '', errorUrl = '' } = customUrls || {};

    await expect(this.labelTemplateName).toHaveText(templateName);
    if (paymentRetries) {
      await expect(this.labelPaymentRetries).toHaveText(paymentRetries);
    }

    if (maxCompletedPurchasesLimit) {
      await expect(this.labelMaxCompletedPurchases).toHaveText(maxCompletedPurchasesLimit);
    }

    await expect(this.labelSuccessUrl).toHaveText(successUrl);
    await expect(this.labelPendingUrl).toHaveText(pendingUrl);
    await expect(this.labelErrorUrl).toHaveText(errorUrl);
  }

  async assertDetailsSummary({
    localeData,
    amounts,
    totalAmount,
  }: {
    localeData: LocaleData;
    amounts: Amounts;
    totalAmount: string;
  }) {
    const { taxAmount, shippingAmount } = amounts;
    const formattedTaxAmount = formatAmount({
      value: parseFloat(taxAmount),
      localeData,
    });
    const formattedShippingAmount = formatAmount({
      value: parseFloat(shippingAmount),
      localeData,
    });
    const formattedTotalAmount = formatAmount({
      value: parseFloat(totalAmount),
      localeData,
    });

    await expect(this.labelTaxAmount).toHaveText(formattedTaxAmount);
    await expect(this.labelShippingAmount).toHaveText(formattedShippingAmount);
    await expect(this.labelTotalAmount).toHaveText(formattedTotalAmount);
  }

  async assertProductDetails({
    productName,
    productAmount,
    localeData,
  }: {
    productName: string;
    productAmount: string;
    localeData: LocaleData;
  }) {
    const productNameLocator = this.getSavedProductNameLocator(productName);
    const productAmountLocator = this.getSavedProductAmountLocator(productName);

    const formattedAmount = formatAmount({
      value: parseFloat(productAmount),
      localeData,
    });

    await expect(productNameLocator).toHaveText(productName);
    await expect(productAmountLocator).toHaveText(formattedAmount);
  }

  async assertSeveralProductsDetails({
    products,
    localeData,
  }: {
    products: Product[];
    localeData: LocaleData;
  }) {
    await Promise.all(
      products.map(({ productName, productAmount }) =>
        this.assertProductDetails({
          productName,
          productAmount,
          localeData,
        })
      )
    );
  }

  async assertLinkCopiedCorrectly({ page }: { page: Page }) {
    const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedLink).toBeTruthy();
  }

  async assertNewTabOpened(context: BrowserContext, originalPageCount: number) {
    const currentPageCount = context.pages().length;
    expect(currentPageCount).toBeGreaterThan(originalPageCount);
  }

  async assertHasOrderRowById(orderId: string) {
    const orderRow = this.getOrderRowLocator(orderId);
    await expect(orderRow).toBeVisible();
  }

  async assertOrderRowCount(expectedCount: number) {
    await expect(this.orderIdCells.first()).toBeVisible({ timeout: 5000 });

    const orderIds = await this.orderIdCells.allTextContents();
    const distinctOrderIds = new Set(orderIds);
    expect(distinctOrderIds.size).toBe(expectedCount);
  }
}
