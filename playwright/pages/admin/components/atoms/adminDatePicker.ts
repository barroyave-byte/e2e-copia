import type { Locator } from '@playwright/test';

import { AdminAtomAbstract } from './adminAtomAbstract';

export interface DatePickerLocators {
  inputDatePicker: Locator;
  dateContainer: Locator;
  applyButton: Locator;
  nextMonthButton: Locator;
  previousMonthButton: Locator;
}

export class AdminDatePicker extends AdminAtomAbstract {
  /**
   * Creates all date picker locators from a base data-testid
   * @param baseDataTestId - Base data-testid (e.g., 'vigency-end-date-input')
   * @returns Object containing all date picker locators
   */
  private getDatePickerLocators(baseDataTestId: string): DatePickerLocators {
    return {
      inputDatePicker: this.page.getByTestId(`${baseDataTestId}-input-date-range`),
      dateContainer: this.page.getByTestId(`${baseDataTestId}-container-floating-content`),
      applyButton: this.page.getByTestId(`${baseDataTestId}-button-apply`),
      nextMonthButton: this.page.getByTestId(`${baseDataTestId}-button-next-month`),
      previousMonthButton: this.page.getByTestId(`${baseDataTestId}-button-prev-month`),
    };
  }

  /**
   * Opens the date picker and validates it's ready for interaction
   */
  private async openDatePicker(locators: DatePickerLocators): Promise<void> {
    await this.assertIsVisible(locators.inputDatePicker);
    await this.assertIsNotVisible(locators.dateContainer);
    await this.click(locators.inputDatePicker, { force: true });
    await this.assertIsVisible(locators.dateContainer);
    await this.assertToBeAttached(locators.nextMonthButton);
    await this.assertToBeAttached(locators.previousMonthButton);
  }

  /**
   * Applies the selected date range
   */
  private async applyDateSelection(applyButton: Locator): Promise<void> {
    await this.assertIsVisible(applyButton);
    await this.click(applyButton, { dispatchEvent: true });
  }

  /**
   * Selects a date range using a base data-testid to derive all locators
   * @param baseDataTestId - Base data-testid (e.g., 'vigency-end-date-input')
   * @param startDate - Start date to select
   * @param endDate - End date to select
   */
  async selectRangeDateByTestId(
    baseDataTestId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const locators = this.getDatePickerLocators(baseDataTestId);
    await this.openDatePicker(locators);
    await this.selectOneDate(
      startDate,
      locators.dateContainer,
      locators.nextMonthButton,
      locators.previousMonthButton
    );
    await this.selectOneDate(
      endDate,
      locators.dateContainer,
      locators.nextMonthButton,
      locators.previousMonthButton
    );
    await this.applyDateSelection(locators.applyButton);
  }

  async selectFirstEnabledDate(containerElement: Locator, applyButton: Locator): Promise<void> {
    const firstEnabledDate = this.getFirstEnabledDate(containerElement);
    await this.assertIsVisible(firstEnabledDate);
    await this.click(firstEnabledDate);
    await this.assertToBeAttached(applyButton);
    await this.click(applyButton, { dispatchEvent: true });
  }

  /**
   * Returns the first enabled date button from the given container element
   * @param containerElement - The container element to search within
   * @returns The first enabled date button
   */
  getFirstEnabledDate(containerElement: Locator): Locator {
    return containerElement.locator('button[data-day]:not([disabled])').first();
  }

  private formatDateToIso(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  getButtonByDate(date: Date, containerElement: Locator): Locator {
    const isoDate = this.formatDateToIso(date);
    return containerElement.locator(`[data-testid$="-button-day-${isoDate}"]`);
  }

  async selectOneDate(
    date: Date,
    containerElement: Locator,
    nextMonthButton: Locator,
    previousMonthButton: Locator
  ): Promise<void> {
    const maxIterations = 24;
    let iterations = 0;
    let dateButton = this.getButtonByDate(date, containerElement);
    let isDateVisible = await dateButton.isVisible();

    while (!isDateVisible && iterations < maxIterations) {
      if (date > new Date()) {
        await this.click(nextMonthButton, { dispatchEvent: true });
      } else {
        await this.click(previousMonthButton, { dispatchEvent: true });
      }
      dateButton = this.getButtonByDate(date, containerElement);
      isDateVisible = await dateButton.isVisible();
      iterations++;
    }

    if (!isDateVisible) {
      throw new Error(
        `Could not navigate to date ${date.toISOString()} after ${maxIterations} attempts`
      );
    }

    await this.click(dateButton, { dispatchEvent: true });
  }
}
