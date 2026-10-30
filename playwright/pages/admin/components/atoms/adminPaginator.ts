import { expect, type Locator, type Page } from '@playwright/test';

import { AdminAtomAbstract } from './adminAtomAbstract';

export class AdminPaginator extends AdminAtomAbstract {
  private readonly buttonPrevPage: Locator;
  private readonly buttonNextPage: Locator;
  private readonly labelInfoPage: Locator;
  private readonly selectPageSize: Locator;

  constructor(
    page: Page,
    testIds: {
      buttonPrevious: string;
      buttonNext: string;
      infoPage: string;
      selectPageSize: string;
    }
  ) {
    super(page);
    this.buttonPrevPage = page.getByTestId(testIds.buttonPrevious);
    this.buttonNextPage = page.getByTestId(testIds.buttonNext);
    this.labelInfoPage = page.getByTestId(testIds.infoPage);
    this.selectPageSize = page.getByTestId(testIds.selectPageSize);
  }

  async goToNextPage(): Promise<void> {
    await expect(this.buttonNextPage).toBeVisible();
    await this.buttonNextPage.click();
  }

  async goToPrevPage(): Promise<void> {
    await expect(this.buttonPrevPage).toBeVisible();
    await this.buttonPrevPage.click();
  }

  async selectPageSizeOption(option: string): Promise<void> {
    await expect(this.selectPageSize).toBeVisible();
    await this.selectPageSize.scrollIntoViewIfNeeded();
    await this.selectPageSize.selectOption(option, { timeout: 40000 });
    await expect(this.selectPageSize).toHaveValue(option);
  }

  async assertCurrentPage(expectedPage: number): Promise<void> {
    await expect(async () => {
      const { currentPage } = await this.getPageInfo();
      expect(currentPage).toBe(expectedPage);
    }).toPass({ timeout: 3500, intervals: [500] });
  }

  async assertTotalPages(expectedPages: number): Promise<void> {
    await expect(async () => {
      const { totalPages } = await this.getPageInfo();
      expect(totalPages).toBe(expectedPages);
    }).toPass({ timeout: 3500, intervals: [500] });
  }

  private async getPageInfo(): Promise<{ currentPage: number; totalPages: number }> {
    const text = await this.labelInfoPage.textContent();
    const pageNumbers = text?.match(/\d+/g)?.map(Number);

    if (!pageNumbers || pageNumbers.length < 2) {
      throw new Error(`Could not parse page info from: "${text}"`);
    }

    if (pageNumbers.length === 2) {
      return { currentPage: pageNumbers[0], totalPages: pageNumbers[1] };
    }

    const [from, , totalRows] = pageNumbers;
    await expect(this.selectPageSize, 'The page size selector is not visible').toBeVisible({
      timeout: 40000,
    });
    const pageSize = Number(await this.selectPageSize.inputValue({ timeout: 40000 }));

    return {
      currentPage: Math.floor((from - 1) / pageSize) + 1,
      totalPages: Math.ceil(totalRows / pageSize),
    };
  }
}
