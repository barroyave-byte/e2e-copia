import { expect, Locator, Page, Response } from '@playwright/test';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import { DATA_TEST_IDS } from './constants';
import { PaymentLink, PaymentLinksResponse } from './interfaces/paymentLink';

const urlAdmin = envConfig.ADMIN_URL;
const CREATE_PAYMENT_LINK_URL = `${urlAdmin}/payment-link/new-link`;

export class AdminPaymentLinkPage {
  readonly selectors: AdminTranslations;
  readonly page: Page;
  readonly labelTitlePaymentLink: Locator;
  readonly buttonCreatePaymentLink: Locator;
  readonly inputSearch: Locator;
  readonly inputDatePicker: Locator;
  readonly selectStatus: Locator;
  readonly buttonClearFilters: Locator;
  readonly tablePaymentLink: Locator;
  readonly modalActions: Locator;
  readonly buttonConfirmActionModal: Locator;
  readonly buttonCancelActionModal: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);

    this.labelTitlePaymentLink = page.getByRole('heading', {
      name: `${this.selectors.screenPaymentLink.labelTitlePaymentLink}`,
    });
    this.buttonCreatePaymentLink = page.getByTestId(DATA_TEST_IDS.CREATE_LINK_BUTTON).first();
    this.inputSearch = page.getByPlaceholder(this.selectors.screenPaymentLink.searchByName);
    this.inputDatePicker = page.getByLabel(this.selectors.screenPaymentLink.searchByDate);
    this.selectStatus = page.getByLabel(this.selectors.screenPaymentLink.stateSelect);
    this.buttonClearFilters = page.getByRole('button', {
      name: this.selectors.screenOrdersSelectors.clearFilter,
    });
    this.tablePaymentLink = page.getByRole('grid');
    this.modalActions = page.getByRole('dialog');
    this.buttonConfirmActionModal = page.getByRole('button', { name: 'Confirm' });
    this.buttonCancelActionModal = page.getByRole('button', { name: 'Cancel' });
  }

  // Actions
  async navigateToCreatePaymentLink() {
    await this.buttonCreatePaymentLink.click();
    await this.page.waitForURL(CREATE_PAYMENT_LINK_URL);
  }

  async searchPaymentLink(searchTerm: string) {
    await this.inputSearch.fill(searchTerm);
  }

  async clearFilters() {
    await this.buttonClearFilters.click();
  }

  async confirmAction() {
    await this.buttonConfirmActionModal.click();
  }

  async cancelAction() {
    await this.buttonCancelActionModal.click();
  }

  // Assertions
  async assertToBeInPaymentLinkPage() {
    await expect(this.labelTitlePaymentLink).toBeVisible();
  }

  async assertActionModalVisible() {
    await expect(this.modalActions).toBeVisible();
  }

  async assertTableContainsData() {
    await expect(this.tablePaymentLink).toBeVisible();
  }

  async waitForPaymentLinksResponse(timeout: number = 30_000) {
    return this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/merchants/payment-links/all' &&
        response.request().method() === 'GET',
      { timeout }
    );
  }

  async getPaymentLinksData(paymentLinksPromise: Promise<Response>): Promise<PaymentLinksResponse> {
    const response = await paymentLinksPromise;
    return response.json();
  }

  findPaymentLinkByName(data: PaymentLinksResponse, name: string): PaymentLink | undefined {
    return data.payment_links.find((link) => link.payment_link_name === name);
  }

  async assertPaymentLinkRowVisible(paymentLinkId: string) {
    const locator = this.page.getByTestId(DATA_TEST_IDS.TABLE_ROW(paymentLinkId));
    await expect(locator).toBeVisible({ timeout: 10_000 });
  }

  async assertPaymentLinksNotEmpty(data: PaymentLinksResponse) {
    expect(data.payment_links.length).toBeGreaterThan(0);
  }
}
