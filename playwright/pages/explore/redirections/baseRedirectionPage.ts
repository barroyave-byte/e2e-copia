import { CommonsActions } from '@pages/commonActions';
import { Page } from '@playwright/test';

export interface Redirection {
  processRedirection(options?: object): Promise<void>;
}

export abstract class BaseRedirectionPage extends CommonsActions implements Redirection {
  protected page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  abstract processRedirection(options: object): Promise<void>;
}
