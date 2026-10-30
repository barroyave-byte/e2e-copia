import { Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import DateTime from '@support/utils/datetime';

export class PayuEfectyPage extends CommonsActions {
  readonly page: Page;

  readonly labelExpirationDate: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.labelExpirationDate = page.locator('.expiration-date span').first();
  }

  // Actions
  async getExpirationDateIso() {
    await this.ensureVisible(this.labelExpirationDate, {});
    const expirationDate = await this.labelExpirationDate.textContent();

    const splittedExpirationDate = expirationDate.split(' ');

    const year = splittedExpirationDate[4];
    const month = DateTime.getMonthByNameES(splittedExpirationDate[2]);
    const day = splittedExpirationDate[0];
    const time = splittedExpirationDate[7];
    const period = splittedExpirationDate[8];
    return DateTime.fromString(`${year}-${month}-${day} ${time} ${period}`).toISOString();
  }
}
